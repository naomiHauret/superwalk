# @superwalk/expo-android

Superwalk Android app built using [Expo](https://docs.expo.dev/) and Google Healthconnect API.

Before getting started, **make sure to**:

1. Run the app using an Android >=9 ;
2. If you're using Android < 14, install the [Healthconnect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata&hl=en_US) app
3. Get your Thirdweb client id
4. Rename the `.env.example` file to `.env` and paste in [your thirdweb client id](https://thirdweb.com/dashboard/settings)
5. Generate the `android` directory using `expo prebuild --platform android --clean` (run this command whenever you change `app.json` or `app.config.js`)
6. Build the `android` directory using `expo run:android`

---

> This project was bootstrapped by cloning the Thirdweb Expo template. You can learn more about it on its [repository](https://github.com/thirdweb-example/expo-starter) or on the [Thirdweb Website](https://thirdweb.com/template/expo-starter). A few lines were edited to match the content of this repository.

## thirdweb expo starter usage

Starter template to build an onchain react native app with [thirdweb](https://thirdweb.com/) and [expo](https://expo.dev/).

### Features

- in-app wallets using phone number, email or social logins to create a wallet for the user
- smart accounts to sponsor gas
- connecting to external wallets like MetaMask via WalletConnect
- autoconnecting to the last connected wallet on launch
- reading contract state and events
- writing to the blockchain

## Installation

Install the template using [thirdweb create](https://portal.thirdweb.com/cli/create)

```bash
  npx thirdweb create app --expo
```

## Get started

1. Get your thirdweb client id

Rename the `.env.example` file to `.env` and paste in your thirdweb client id.

You can obtain a free client id from the [thirdweb dashboard](https://thirdweb.com/dashboard/settings).

2. Start the app

```bash
yarn android
```

To run this app, you'll need either:

- the [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- an Android device running version >=9 ;
- If you're using Android < 14, install the [Healthconnect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata&hl=en_US) app

## Additional Resources

- [Documentation](https://portal.thirdweb.com/typescript/v5)
- [Templates](https://thirdweb.com/templates)
- [YouTube](https://www.youtube.com/c/thirdweb)

## Support

For help or feedback, please [visit our support site](https://thirdweb.com/support)
