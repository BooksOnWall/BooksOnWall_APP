package com.booksonwall.Mapbox;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.mapbox.api.directions.v5.models.DirectionsResponse;
import com.mapbox.geojson.Point;
import com.mapbox.mapboxsdk.Mapbox;
import com.mapbox.services.android.navigation.ui.v5.NavigationLauncher;
import com.mapbox.services.android.navigation.ui.v5.NavigationLauncherOptions;
import com.mapbox.services.android.navigation.v5.navigation.MapboxNavigation;
import com.mapbox.services.android.navigation.v5.navigation.NavigationRoute;
import com.booksonwall.R;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MapboxNavigationManager extends ReactContextBaseJavaModule implements Callback<DirectionsResponse>{

    private Context context;
    MapboxNavigation navigation;

    public MapboxNavigationManager(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext;

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                Mapbox.getInstance(context, context.getString(R.string.mapbox_access_token));
                navigation = new MapboxNavigation(context, context.getString(R.string.mapbox_access_token));
            }
        });
    }

    @Override
    public String getName() {
        return "MapboxNavigation";
    }


    @ReactMethod
    public void navigate(Double originLat, Double originLong, Double destLat, Double destLong) {

        Point origin = Point.fromLngLat(originLong, originLat);
        Point destination = Point.fromLngLat(destLong, destLat);

        NavigationRoute.builder(context)
                .accessToken(context.getString(R.string.mapbox_access_token))
                .origin(origin)
                .destination(destination)
                .build()
                .getRoute(this);
    }

    @ReactMethod
    public void takeMeToWH() {

        Point origin = Point.fromLngLat(-77.03613, 38.90992);
        Point destination = Point.fromLngLat(-77.0365, 38.8977);

        NavigationRoute.builder(context)
                .accessToken(context.getString(R.string.mapbox_access_token))
                .origin(origin)
                .destination(destination)
                .build()
                .getRoute(this);
    }

    @Override
    public void onResponse(Call<DirectionsResponse> call, final Response<DirectionsResponse> response) {
        Log.d("MapboxModule", response.body().routes().get(0).toJson());

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                Log.d("onResponse","onResponse");
                NavigationLauncherOptions options = NavigationLauncherOptions.builder()
                        .directionsRoute(response.body().routes().get(0))
                        .build();

                NavigationLauncher.startNavigation(getCurrentActivity(), options);

            }
        });
    }

    @Override
    public void onFailure(Call<DirectionsResponse> call, Throwable t) {

    }
}