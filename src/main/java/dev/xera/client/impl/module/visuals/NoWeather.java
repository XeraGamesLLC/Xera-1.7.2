package dev.xera.client.impl.module.visuals;

import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class NoWeather extends ToggleableModule {
    public NoWeather() {
        super("No Weather", new String[]{"noweather", "antiweather", "norain", "nothunder"}, ModuleCategory.VISUALS);
    }
}
