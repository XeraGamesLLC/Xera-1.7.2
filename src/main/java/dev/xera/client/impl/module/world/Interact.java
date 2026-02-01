package dev.xera.client.impl.module.world;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.world.EventLiquidCollideCheck;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class Interact extends ToggleableModule {
    private final Property<Boolean> liquidPlace = new Property<>(false, "Liquid Place", "liquidplace", "waterplace");

    public Interact() {
        super("Interact", new String[]{"interactwiththingsweirdly"}, ModuleCategory.WORLD);
        offerProperties(liquidPlace);
    }

    @EventListener
    public void onLiquidCollideCheck(EventLiquidCollideCheck event) {
        event.setIn(event.isIn() || liquidPlace.getValue());
    }
}
