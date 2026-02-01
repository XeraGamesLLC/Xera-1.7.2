package dev.xera.client.impl.module.world;

import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class AutoHighway extends ToggleableModule {


    public AutoHighway() {
        super("Auto Highway", new String[]{"autohighway", "highwaybuilder", "highwaypaver"}, ModuleCategory.WORLD);
    }
}
