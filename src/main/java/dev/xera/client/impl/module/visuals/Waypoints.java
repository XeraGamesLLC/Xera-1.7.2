package dev.xera.client.impl.module.visuals;

import dev.xera.client.api.property.Property;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class Waypoints extends ToggleableModule {
    public static boolean render = true;

    public static final Property<Boolean> rectangle = new Property<>(false, "Rectangle", "rects");
    public static final Property<Boolean> coordinates = new Property<>(false, "Coordinates", "coords");
    public static final Property<Boolean> distance = new Property<>(true, "Distance", "dist");
    public static final Property<Double> scaling = new Property<>(0.3, 0.1, 1.0, "Scaling", "scale");
    public static final Property<Boolean> antiScreenshot = new Property<>(true, "Anti Screenshot", "antiscreenshot");

    public Waypoints() {
        super("Waypoints", new String[]{"wps"}, ModuleCategory.VISUALS);
        offerProperties(rectangle, coordinates, distance, scaling, antiScreenshot);

        // set it running and not drawn by default, configs will change this
        setRunning(true);
        setDrawn(false);
    }

    @Override
    protected void onEnable() {
        super.onEnable();
        render = true;
    }
}
