package dev.xera.client.impl.module.visuals;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.impl.event.impl.client.EventTick;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class Yaw extends ToggleableModule {
    public Yaw() {
        super("Yaw", new String[]{"yaw", "yawlock"}, ModuleCategory.VISUALS);
    }

    @EventListener
    public void onTick(EventTick event) {
        mc.thePlayer.rotationYaw = Math.round((mc.thePlayer.rotationYaw + 1.0f) / 45.0f) * 45.0f;
    }
}
