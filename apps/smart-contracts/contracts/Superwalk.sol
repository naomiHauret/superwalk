// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IEntropyConsumer} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropy} from "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";

/**
** - Superwalk -
* -- A turn-based game that uses the players' real world step count to influence the competition.
* -- Uses Entropy for RNG -- see https://docs.pyth.network/entropy
*/
contract SuperwalkCompetition is IEntropyConsumer {
  enum EffectType { Offensive, Defensive, Boost }
  enum EffectValueType { Percent, Absolute }
  enum ActionType { UseItem, Block, Bribe }

  struct PlayerInventoryItem {
    uint256 itemId;
    uint256 quantity;
  }

  struct Player {
    uint256 currentSteps;  // Current turn's step count
    uint256 lastSteps;   // Last turn's step count
    uint256 score;     // Computed score after applying effects
    uint256 cooldownEnd;   // Turn number when cooldown ends
    mapping(uint256 => bool) actionsPerformed; // Turn => bool (if action has been performed)
    mapping(uint256 => ActionType) actions;  // Turn => ActionType
    mapping(uint256 => PlayerInventoryItem) inventory;
    uint256[] inventoryItemIds;
    string metadataUri;
    bool exists;
  }

  struct ActionHistory {
    ActionType actionType;
    address targetPlayer;
    uint256 itemId;
    uint256 timestamp;
  }

  struct GameItem {
    string name;
    EffectType effectType;  // Type of the item: Offensive, Defensive, or Boost
    uint256 effectValue;
    uint256 successRatePercentage;  // Success rate of the item in percentage (e.g., 85 means 85%)
    EffectValueType effectValueType; // If the effect value is in percentage or absolute on steps (e.g., if true, effectValue of 30 means 30% effect)
    uint256 cooldownValue; // how many round the user will be in cooldown after using this item
    string metadataUri;
  } 

  struct ActionRequest {
    address player;
    ActionType actionType;
    uint256 itemId;
    address targetPlayer;
  }

  struct ItemPickRequest {
    address player;
  }

  // -- State Variables --
  // Game settings
  address public owner;  // Contract owner
  address public bribeErc20TokenAddress;  // ERC20 Token address used for bribes
  uint256 public turnNumber;  // Current turn number
  uint256 public itemsTypesCount;  // Track the total number of items in the mapping (required for randomness)
  
  // Mappings
  address[] public playersList;  // List of players
  mapping(address => Player) public players;  // Mapping to easily access players (address => player)
  mapping(uint256 => GameItem) public items;  // Mapping to easily access items (itemId => GameItem)
  mapping(uint64 => ActionRequest) public pendingActions;  // Pending actions tied to entropy requests
  mapping(uint64 => ItemPickRequest) public pendingItemPicks;  // Pending item pick requests tied to entropy

  // Constants
  uint256 public constant THRESHOLD_NEW_STEP_ITEM_UNLOCK = 100; // Minimum amount of new steps required to unlock a new item at the beginning of a new turn
  uint256 public constant TURN_DURATION = 1 hours;  // Each turn lasts 1 hour
  uint256 public constant ACTION_WINDOW = 20 minutes;  // Action window in each turn
  uint256 public constant MAX_INVENTORY_SIZE = 12;  // Max items a player can hold in inventory

  // Entropy
  address public entropyProvider;
  IEntropy public entropy;

  // -- Events --
  event InitializeSuperwalk(address _owner, address _entropyProvider, address _bribeErc20TokenAddress, uint256 _stepsItemUnlockThreshold,  uint256 _turnDuration, uint256 _actionWindowDuration, uint256 _maxInventorySize);
  event GameItemCreated(string _name, EffectType _effectType, uint256 _effectValue, uint256 _successRate, EffectValueType _effectValueType, uint256 _cooldownValue, string _metadataUri);
  event PlayerJoined(address indexed _player, string _metadataUri);
  event StepsCountReported(address indexed _player, uint256 _steps);
  event PerformActionRequested(address indexed _player, ActionType _actionType, uint256 _itemId, address _targetPlayer);
  event ScoreUpdated(address indexed _player, uint256 _score);
  event TurnEnded(uint256 _turnNumber);
  event BribeSent(address indexed _fromPlayer, address indexed _toPlayer, uint256 _amount);
  event ItemPicked(address indexed _player, uint256 _itemId);
  event ItemUsed(address indexed _player, uint256 _itemId, uint256 _turnNumber, bool _success);
  event Blocked(address indexed _player, uint256 _turnNumber, bool _success);
  event ItemPickRequested(address indexed _player, uint64 _sequenceNumber);

  // -- Modifiers --
  /**
   * @dev Ensures the caller is a registered player.
   */
  modifier onlyPlayer() {
    require(players[msg.sender].exists, "Player does not exist");
    _;
  }

  /**
   * @dev Ensures the caller is the contract owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner, "Caller is not the owner");
    _;
  }

  /**
   * @dev Ensures the action is performed within the allowed time window.
   */
  modifier withinActionWindow() {
    require(block.timestamp % TURN_DURATION < ACTION_WINDOW, "Action window closed");
    _;
  }

  // -- Constructor --
  /**
   * @dev Initializes the contract by setting the owner, entropy provider, and bribe token address.
   * @param _entropy The address of the entropy contract.
   * @param _entropyProvider The address of the entropy provider.
   * @param _bribeToken The address of the ERC20 token used for bribes.
   */
  constructor(address _entropy, address _entropyProvider, address _bribeToken) {
    owner = msg.sender;  // Set the contract deployer as the owner
    bribeErc20TokenAddress = _bribeToken;
    entropy = IEntropy(_entropy);
    entropyProvider = _entropyProvider;
    turnNumber = 1;
    itemsTypesCount = 0;

    emit InitializeSuperwalk(owner, entropyProvider, bribeErc20TokenAddress, THRESHOLD_NEW_STEP_ITEM_UNLOCK, TURN_DURATION, ACTION_WINDOW, MAX_INVENTORY_SIZE);
  }

  // -- Game Functions --
  /**
   * @dev Creates a new game item. Only callable by the contract owner.
   * @param name The name of the item.
   * @param effectType The type of effect (Offensive, Defensive, Boost).
   * @param effectValue The value of the effect.
   * @param successRate The success rate of the item in percentage (0-10000, representing 0%-100%).
   * @param effectValueType The type of effect value (Percent or Absolute).
   * @param metadataUri Metadata URI for the item.
   */
  function createGameItemType(
    string memory name,
    EffectType effectType,
    uint256 effectValue,
    uint256 successRate,
    EffectValueType effectValueType,
    uint256 cooldownValue,
    string memory metadataUri
  ) public onlyOwner {
    itemsTypesCount++;
    items[itemsTypesCount] = GameItem(name, effectType, effectValue, successRate, effectValueType, cooldownValue, metadataUri);
    emit GameItemCreated(name, effectType, effectValue, successRate, effectValueType, cooldownValue, metadataUri);
  }

  /**
   * @dev Allows a player to join the competition.
   * @param _metadata Metadata URI for the player.
   */
  function joinCompetition(string memory _metadata) external {
    require(!players[msg.sender].exists, "You already joined the competition.");
    
    Player storage newPlayer = players[msg.sender];
    newPlayer.currentSteps = 0;
    newPlayer.lastSteps = 0;
    newPlayer.score = 0;
    newPlayer.cooldownEnd = 0;
    newPlayer.metadataUri = _metadata;
    newPlayer.exists = true;
    playersList.push(msg.sender);
    emit PlayerJoined(msg.sender, _metadata);
  }

  /**
   * @dev Allows a player to pick a random item at the beginning of a turn, provided they have taken enough steps.
   * @param userProvidedRandomNumber A random number provided by the user.
   */
  function pickItem(bytes32 userProvidedRandomNumber) external payable onlyPlayer withinActionWindow() {
    Player storage player = players[msg.sender];
    require(player.currentSteps >= player.lastSteps + THRESHOLD_NEW_STEP_ITEM_UNLOCK, "You did not walk enough last turn to unlock a new item.");
    require(player.inventoryItemIds.length < MAX_INVENTORY_SIZE, "Your inventory is full.");

    // Request randomness for the item pick
    uint128 requestFee = entropy.getFee(entropyProvider);
    require(msg.value >= requestFee, "Not enough fees");

    uint64 sequenceNumber = entropy.requestWithCallback{value: requestFee}(
      entropyProvider,
      userProvidedRandomNumber
    );

    // Store the item pick request in the list of requests for entropy
    pendingItemPicks[sequenceNumber] = ItemPickRequest({
      player: msg.sender
    });

    emit ItemPickRequested(msg.sender, sequenceNumber);
  }

  /**
   * @dev Reports a player's step count. Only callable by the owner to prevent tampering.
   * @param _player The address of the player.
   * @param updatedStepsCount The updated step count.
   */
  function reportSteps(address _player, uint256 updatedStepsCount) external onlyOwner {
    require(players[_player].exists, "This player does not exist");
    Player storage player = players[_player];
    player.currentSteps = updatedStepsCount;
    emit StepsCountReported(_player, updatedStepsCount);
  }

  /**
   * @dev Allows a player to perform an action during the action window of the current turn.
   * @param actionType The type of action (UseItem, Block, Bribe).
   * @param itemId The ID of the item used (if applicable).
   * @param targetPlayer The address of the target player (if applicable).
   * @param userRandomNumber A random number provided by the user.
   */
  function performAction(
    ActionType actionType,
    uint256 itemId,
    address targetPlayer,
    bytes32 userRandomNumber
  ) external payable onlyPlayer withinActionWindow {
    Player storage player = players[msg.sender];
    require(player.cooldownEnd <= turnNumber, "You're still in cooldown period.");
    require(!player.actionsPerformed[turnNumber], "You already played this turn.");
    player.actionsPerformed[turnNumber] = true;
    player.actions[turnNumber] = actionType;

    if (actionType == ActionType.Bribe) {
      require(player.currentSteps > 0, "You need to walk to bribe other players.");
      require(players[targetPlayer].exists, "Player does not exist");
      player.cooldownEnd = turnNumber + 1; // Bribing will place user in cooldown for 1 round
      uint256 _steps = player.currentSteps > 0 ? player.currentSteps : 1;
      uint256 bribeAmount = (5 * _steps) / 10000;  // fixed value for now, but could be fixed by the player themselves
      IERC20(bribeErc20TokenAddress).transferFrom(msg.sender, targetPlayer, bribeAmount);
      emit BribeSent(msg.sender, targetPlayer, bribeAmount);
    } else {
      // Request randomness for the action
      uint128 requestFee = entropy.getFee(entropyProvider);
      require(msg.value >= requestFee, "Not enough fees");

      uint64 sequenceNumber = entropy.requestWithCallback{value: requestFee}(
        entropyProvider,
        userRandomNumber
      );

      // Store the action request to resolve it in the callback
      pendingActions[sequenceNumber] = ActionRequest({
        player: msg.sender,
        actionType: actionType,
        itemId: itemId,
        targetPlayer: targetPlayer
      });

      emit PerformActionRequested(msg.sender, actionType, itemId, targetPlayer);
    }
  }

  /**
   * @dev Advances to the next turn. Only callable by the owner.
   */
  function endTurn() external onlyOwner {
    turnNumber += 1;
    emit TurnEnded(turnNumber);  // Emit an event when a turn ends
  }

  /**
   * @dev Updates the score of a given player and updates their last step count. Only callable by the owner.
   * @param _player The address of the player.
   * @param _score The new score for the player.
   */
  function reportScore(address _player, uint256 _score) external onlyOwner {
    Player storage player = players[_player];
    player.score = _score; // Update player score with value computed off-chain
    player.lastSteps = player.currentSteps; 
    emit ScoreUpdated(_player, _score);  // Emit an event when a player's score is updated
  }

  /**
   * @dev returns the address of the entropy contract which will call the callback.
  */
  function getEntropy() internal view override returns (address) {
  return address(entropy);
  }

  /**
   * @dev Handles the callback from the entropy provider.
   * @param sequenceNumber The sequence number associated with the request.
   * @param provider The address of the entropy provider.
   * @param randomNumber The random number provided by entropy
   */
  function entropyCallback(uint64 sequenceNumber, address provider, bytes32 randomNumber) internal override {
    require(provider == entropyProvider, "Invalid entropy provider");

    // Check if the callback is for an action
    if (pendingActions[sequenceNumber].player != address(0)) {
      ActionRequest memory request = pendingActions[sequenceNumber];
      Player storage player = players[request.player];
      bool success;

      if (request.actionType == ActionType.UseItem) {
        // Wheter or not the "use item" action performed by the player is successful
        GameItem memory gameItem = items[request.itemId];
        success = (uint256(randomNumber) % 10000) < gameItem.successRatePercentage;
        require(player.inventory[request.itemId].quantity > 0, "Item not in inventory");
        player.inventory[request.itemId].quantity -= 1;

        emit ItemUsed(request.player, request.itemId, turnNumber, success);

      } else if (request.actionType == ActionType.Block) {
        // Wheter or not the "block" action performed by the player is successful
        uint256 blockSuccessRate = (player.currentSteps * 100) / player.lastSteps;
        success = (uint256(randomNumber) % 100) < blockSuccessRate;
        player.cooldownEnd = success ? turnNumber + 1 : turnNumber; // if the block is successful, then next turn the user will be in cool down for 1 turn ;
        emit Blocked(request.player, turnNumber, success);
      }

      delete pendingActions[sequenceNumber];
    }
    // Check if the callback is for an item pick
    else if (pendingItemPicks[sequenceNumber].player != address(0)) {
      ItemPickRequest memory request = pendingItemPicks[sequenceNumber];
      Player storage player = players[request.player];

      // Calculate the random item to pick
      require(itemsTypesCount > 0, "No game items created"); // Ensure there are items to pick from
      uint256 randomItemId = uint256(randomNumber) % itemsTypesCount + 1;  // Select a random item ID
      _addItemPlayerToInventory(player, randomItemId); // add items to player's inventory
      emit ItemPicked(request.player, randomItemId);
      delete pendingItemPicks[sequenceNumber];
    }
  }

  /**
   * @dev Helper function to add an item to the player's inventory.
   * @param player The player to whom the item is being added.
   * @param itemId The ID of the item being added.
   */
  function _addItemPlayerToInventory(Player storage player, uint256 itemId) internal {
    if (player.inventory[itemId].itemId == 0) {
      player.inventory[itemId] = PlayerInventoryItem(itemId, 1);
      player.inventoryItemIds.push(itemId);
    } else {
      player.inventory[itemId].quantity += 1;
    }
  }
}
