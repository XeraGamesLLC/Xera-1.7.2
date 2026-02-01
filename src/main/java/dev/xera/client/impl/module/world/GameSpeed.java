package dev.xera.client.impl.module.world;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.client.EventTick;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class GameSpeed extends ToggleableModule {
    private final Property<Float> speed = new Property<>(1.0f, 0.1f, 20.0f, "Speed", "tickspeed");

    public GameSpeed() {
        super("Game Speed", new String[]{"gamespeed", "timer"}, ModuleCategory.WORLD);
        offerProperties(speed);
    }

    @Override
    public String getTag() {
        return String.valueOf(speed.getValue());
    }

    @Override
    protected void onDisable() {
        super.onDisable();

        if (!isNull()) {
            mc.timer.timerSpeed = 1.0f;
        }
    }

    @EventListener
    public void onTick(EventTick event) {
        mc.timer.timerSpeed = speed.getValue();
    }
}
