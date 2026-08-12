const { withAppDelegate, WarningAggregator } = require('expo/config-plugins');

// The @react-native-firebase/app-check plugin appends its own FirebaseApp.configure()
// after the one @react-native-firebase/app already injected, so FIRApp raises
// appWasConfiguredTwice and the app aborts on launch. Drop the earlier call and keep
// app-check's, which sits after RNFBAppCheckModule.sharedInstance() as Firebase requires.
// Upstream: invertase/react-native-firebase packages/app-check/plugin/src/ios/appDelegate.ts
const CONFIGURE = 'FirebaseApp.configure()';
const APP_CHECK_INIT = 'RNFBAppCheckModule.sharedInstance()';
const GENERATED_CONFIGURE =
  /([ \t]*\/\/ @generated begin @react-native-firebase\/app-didFinishLaunchingWithOptions[^\n]*\n)[ \t]*FirebaseApp\.configure\(\)\n/;

module.exports = function withFirebaseConfigureOnce(config) {
  return withAppDelegate(config, cfg => {
    const { contents } = cfg.modResults;
    const configureCount = contents.split(CONFIGURE).length - 1;

    if (configureCount < 2 || !contents.includes(APP_CHECK_INIT)) {
      return cfg;
    }

    if (!GENERATED_CONFIGURE.test(contents)) {
      WarningAggregator.addWarningIOS(
        'withFirebaseConfigureOnce',
        `Found ${configureCount} ${CONFIGURE} calls but none inside the @react-native-firebase/app generated block. Leaving AppDelegate untouched; the app will crash on launch until this is resolved.`,
      );
      return cfg;
    }

    cfg.modResults.contents = contents.replace(GENERATED_CONFIGURE, '$1');
    return cfg;
  });
};
