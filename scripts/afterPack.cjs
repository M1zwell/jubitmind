// Ad-hoc sign the macOS app so Gatekeeper shows "unidentified developer"
// instead of "damaged". No Apple Developer certificate required.
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  console.log(`[afterPack] Ad-hoc signing: ${appPath}`);
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, {
      stdio: 'inherit',
    });
    console.log('[afterPack] Ad-hoc signing complete');
  } catch (err) {
    console.warn('[afterPack] Ad-hoc signing failed (non-fatal):', err.message);
  }
};
