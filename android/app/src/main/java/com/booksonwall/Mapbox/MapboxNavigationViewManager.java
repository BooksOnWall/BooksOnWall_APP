package com.booksonwall.Mapbox;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.annotation.UiThread;
import android.util.Log;
import android.widget.FrameLayout;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.uimanager.common.UIManagerType;
import com.mapbox.api.directions.v5.models.DirectionsResponse;
import com.mapbox.geojson.Point;
import com.mapbox.mapboxsdk.Mapbox;
import com.mapbox.services.android.navigation.ui.v5.NavigationLauncher;
import com.mapbox.services.android.navigation.ui.v5.NavigationLauncherOptions;
import com.mapbox.services.android.navigation.v5.navigation.MapboxNavigation;
import com.mapbox.services.android.navigation.v5.navigation.NavigationRoute;
import com.booksonwall.R;

import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MapboxNavigationViewManager extends SimpleViewManager<FrameLayout> implements Callback<DirectionsResponse> {

    public static final String REACT_CLASS = "MapboxNavigationView";

    private FrameLayout mapBoxView;
    private ReactApplicationContext context;

    private ReadableMap origin;
    private ReadableMap destination;

    public MapboxNavigationViewManager() {
        this.context = null;
    }

    public MapboxNavigationViewManager(ReactApplicationContext reactContext) {
        this.context = reactContext;

        this.initMapbox();
    }

    public void initMapbox(){
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                Mapbox.getInstance(context, context.getString(R.string.mapbox_access_token));
            }
        });
    }

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    public FrameLayout createViewInstance(ThemedReactContext reactContext) {
        mapBoxView = new FrameLayout(reactContext);
        return mapBoxView;
    }

    @ReactProp(name = "origin")
    public void setOrigin(FrameLayout view, @Nullable ReadableMap origin) {
        this.origin = origin;
        if(this.origin != null && this.destination != null) navigate();
    }

    @ReactProp(name = "destination")
    public void setDestination(FrameLayout view, @Nullable ReadableMap destination) {
        this.destination = destination;
        if(this.origin != null && this.destination != null) navigate();
    }

    public void navigate() {
        Point origin = Point.fromLngLat(this.origin.getDouble("long"), this.origin.getDouble("lat"));
        Point destination = Point.fromLngLat(this.destination.getDouble("long"), this.destination.getDouble("lat"));

        NavigationRoute.builder(context)
                .accessToken(context.getString(R.string.mapbox_access_token))
                .origin(origin)
                .destination(destination)
                .build()
                .getRoute(this);
    }

    @Override
    public void onResponse(Call<DirectionsResponse> call, final Response<DirectionsResponse> response) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                NavigationLauncherOptions options = NavigationLauncherOptions.builder()
                        .directionsRoute(response.body().routes().get(0))
                        .build();
                NavigationLauncher.startNavigation( context.getCurrentActivity(), options);
            }
        });
    }

    @Override
    public void onFailure(Call<DirectionsResponse> call, Throwable t) {

    }
}
