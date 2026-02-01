package dev.xera.client.impl.module.active;

import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class Capes extends ToggleableModule {
    public Capes() {
        super("Capes", new String[]{"showcapes"}, ModuleCategory.ACTIVE);

        setRunning(true);
        setDrawn(false);
    }
}
