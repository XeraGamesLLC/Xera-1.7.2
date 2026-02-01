package dev.xera.client.impl.module.movement;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.move.EventMotion;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class FastSwim extends ToggleableModule {
    private final Property<Double> waterSpeed = new Property<>(2.0, 0.1, 5.0, "Water Speed", "waterspeed");
    private final Property<Double> lavaSpeed = new Property<>(1.2, 0.1, 5.0, "Lava Speed", "lavaspeed");
    private final Property<Double> yMultiplier = new Property<>(1.2, 0.1, 5.0, "Y Multiplier", "ymp");

    public FastSwim() {
        super("Fast Swim", new String[]{"fastswim", "fasterswim"}, ModuleCategory.MOVEMENT);
        offerProperties(waterSpeed, lavaSpeed, yMultiplier);
    }

    @EventListener
    public void onMotion(EventMotion event) {
        if (mc.thePlayer.isInWater()) {

            event.x *= waterSpeed.getValue() / 2.0;
            event.y *= yMultiplier.getValue();
            event.z *= waterSpeed.getValue() / 2.0;

        }

        if (mc.thePlayer.isInLava()) {
            event.x *= lavaSpeed.getValue() / 2.0;
            event.y *= yMultiplier.getValue();
            event.z *= lavaSpeed.getValue() / 2.0;
        }
    }
}
