// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract SuperwalkCompetition {
  enum EffectType { Offensive, Defensive, Boost }
  enum EffectValueType { Percent, Absolute }
  enum ActionType { UseItem, Block, Bribe }

  struct InventoryItem {
    uint256 itemId;
    uint256 quantity;
  }
  struct Player {
    uint256 currentSteps;  // Current turn's step count
    uint256 lastSteps;  // Last turn's step count
    uint256 score;  // Computed score after applying effects
    uint256 cooldownEnd;  // Turn number when cooldown ends
    string metadata;
    mapping(uint256 => bool) actionsPerformed;  // Turn => bool (if action has been performed)
    mapping(uint256 => ActionType) actions;  // Turn => ActionType
    mapping(uint256 => InventoryItem) inventory;
    uint256[] inventoryItemIds;
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
    EffectValueType effectValueType;  // If the effect value is in percentage or absolute on steps (e.g., if true, effectValue of 30 means 30% effect)
  }

  address public owner;
  uint256 public turnNumber;
  address public bribeErc20TokenAddress;  // ERC20 Token address used for bribes
  uint256 public constant TURN_DURATION = 1 hours;  // Each turn lasts 1 hour
  uint256 public constant ACTION_WINDOW = 30 minutes;  // Action window in each turn
  uint256 public constant MAX_INVENTORY_SIZE = 12;
  mapping(address => Player) public players;
  address[] public playersList;
  mapping(uint256 => GameItem) public items;

  event PlayerJoined(address indexed player, string metadata);
  event ActionPerformed(address indexed player, ActionType actionType, uint256 itemId, address targetPlayer);
  event ScoreUpdated(address indexed player, uint256 score);
  event TurnEnded(uint256 turnNumber);
  event BribeSent(address indexed from, address indexed to, uint256 amount);
  event ItemPicked(address indexed player, uint256 itemId);
  event ItemUsed(address indexed player, uint256 itemId, uint256 turnNumber, bool success);

  modifier onlyPlayer() {
    require(players[msg.sender].exists, "Player does not exist");
    _;
  }
  modifier onlyOwner() {
    require(msg.sender == owner, "Caller is not the owner");
    _;
  }
  modifier withinActionWindow() {
    require(block.timestamp % TURN_DURATION < ACTION_WINDOW, "Action window closed");
    _;
  }

  constructor(address _bribeToken) {
    owner = msg.sender;  // Set the contract deployer as the owner
    bribeErc20TokenAddress = _bribeToken;
    // Initialize some items (name, effect type, effect value, success rate, effect value type )
    items[1] = GameItem("'nana peel", EffectType.Offensive, 5, 75,  EffectValueType.Percent);
    items[2] = GameItem("Pogo stick", EffectType.Boost, 100, 50, EffectValueType.Absolute);
    turnNumber = 1;
  }
  /*
    Let caller join the competition as a player
  */
  function joinCompetition(string memory _metadata) external {
    require(!players[msg.sender].exists, "You already joined the competition.");
        
    Player storage newPlayer = players[msg.sender];
    newPlayer.currentSteps = 0;
    newPlayer.lastSteps = 0;
    newPlayer.score = 0;
    newPlayer.cooldownEnd = 0;
    newPlayer.metadata = _metadata;
    newPlayer.exists = true;
    playersList.push(msg.sender);
    emit PlayerJoined(msg.sender, _metadata);
  }
  /*
    Report a player's step count. Can only be called by the owner address to prevent tampering.
  */
  function reportSteps(address _player, uint256 updatedStepsCount) external onlyOwner {
    require(players[_player].exists, "Player does not exist");
    Player storage player = players[_player];
    player.currentSteps = updatedStepsCount;
  }
  /*
    Let player perform an action during the action window of the current turn.
    Actions: Use an item, Block, or Bribe another player.
  */
  function performAction(ActionType actionType, uint256 itemId, address targetPlayer) external onlyPlayer withinActionWindow {
    Player storage player = players[msg.sender];
    require(player.cooldownEnd <= turnNumber, "Can't perform action during cooldown period.");
    require(!player.actionsPerformed[turnNumber], "Action already performed this turn");
    player.actionsPerformed[turnNumber] = true;
    player.actions[turnNumber] = actionType;

    if (actionType == ActionType.UseItem) {
      // Use pyth entropy to randomly decide success

      // bool success = ... calculate success for action based on success rate of object ...
      bool success = true;
      require(player.inventory[itemId].quantity > 0, "Item not in inventory");
      GameItem memory gameItem = items[itemId];
      player.inventory[itemId].quantity -= 1;

      emit ItemUsed(msg.sender, itemId, turnNumber, success);
    } else if (actionType == ActionType.Block) {
      // Use pyth entropy to randomly decide success
      // bool success = ... calculate success for action based on user current step count ...

    } else if (actionType == ActionType.Bribe) {
        require(player.currentSteps > 0, "Insufficient steps for bribe");
        uint256 bribeAmount = 0; // placeholder
        // Calculate bribe...

        //. .. Logic to transfer bribe token from player to targetPlayer ...

        emit BribeSent(msg.sender, targetPlayer, bribeAmount);
    }

    emit ActionPerformed(msg.sender, actionType, itemId, targetPlayer);
  }

  function endTurn() external onlyOwner {
    turnNumber += 1;
    emit TurnEnded(turnNumber);  // Emit an event when a turn ends
  }
  function reportScore(address _player, uint256 _score) external onlyOwner() {
    Player storage player = players[_player];
    player.score = _score; // update player score with value computed offchain
    player.lastSteps = player.currentSteps; 
    emit ScoreUpdated(_player, _score);  // Emit an event when a player's score is updated
  }
  function _getRandomItemId() internal view returns (uint256) {
    // Use pyth entropy to get random id
    uint256 itemId = 1;
    return itemId;
  }
}
