package com.booksonwall;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.zmxv.RNSound.RNSoundPackage;
import com.github.yamill.orientation.OrientationPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.rnziparchive.RNZipArchivePackage;
import com.corbt.keepawake.KCKeepAwakePackage;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import com.mapbox.rctmgl.RCTMGLPackage;
import com.reactcommunity.rnlocalize.RNLocalizePackage;
import com.rnfs.RNFSPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import org.devio.rn.splashscreen.SplashScreenReactPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.swmansion.rnscreens.RNScreensPackage;
import com.swmansion.reanimated.ReanimatedPackage;
import com.reactnativecommunity.rnpermissions.RNPermissionsPackage;
import com.heanoria.library.reactnative.locationenabler.RNAndroidLocationEnablerPackage;
import com.reactnativecommunity.geolocation.GeolocationPackage;
import org.reactnative.maskedview.RNCMaskedViewPackage;
import com.th3rdwave.safeareacontext.SafeAreaContextPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;

import com.viromedia.bridge.ReactViroPackage;

import com.viromedia.bridge.ReactViroPackage;

import com.viromedia.bridge.ReactViroPackage;
import com.facebook.soloader.SoLoader;
import com.booksonwall.Mapbox.MapboxNavigationViewPackage;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),,,
          new ReactViroPackage(ReactViroPackage.ViroPlatform.valueOf(BuildConfig.VR_PLATFORM))
          new ReactViroPackage(ReactViroPackage.ViroPlatform.valueOf(BuildConfig.VR_PLATFORM))
            new RNSoundPackage(),
            new OrientationPackage(),
            new RNDeviceInfo(),
            new RNZipArchivePackage(),
            new KCKeepAwakePackage(),
            new NetInfoPackage(),
            new RCTMGLPackage(),
            new RNLocalizePackage(),
            new RNFSPackage(),
            new RNFetchBlobPackage(),
            new SplashScreenReactPackage(),
            new VectorIconsPackage(),
            new RNGestureHandlerPackage(),
            new RNScreensPackage(),
            new ReanimatedPackage(),
            new RNPermissionsPackage(),
            new RNAndroidLocationEnablerPackage(),
            new GeolocationPackage(),
            new RNCMaskedViewPackage(),
            new SafeAreaContextPackage(),
          new MapboxNavigationViewPackage(),
          new ReactViroPackage(ReactViroPackage.ViroPlatform.valueOf(BuildConfig.VR_PLATFORM))
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
