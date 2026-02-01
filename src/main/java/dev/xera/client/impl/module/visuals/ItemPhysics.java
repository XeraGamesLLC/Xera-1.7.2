package dev.xera.client.impl.module.visuals;

import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class ItemPhysics extends ToggleableModule {
    public ItemPhysics() {
        super("Item Physics", new String[]{"itemphysics", "dropphysics"}, ModuleCategory.VISUALS);
    }
}
