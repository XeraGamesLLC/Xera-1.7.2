package dev.xera.client.impl.module.movement;

import me.bush.eventbus.annotation.EventListener;
import net.minecraft.util.AxisAlignedBB;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.client.EventTick;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.utils.player.PlayerUtils;

public class FastFall extends ToggleableModule {
    private final Property<Float> speed = new Property<>(2.0f, 0.2f, 5.0f, "Speed", "s");
    private final Property<Float> distance = new Property<>(3.0f, 1.0f, 10.0f, "Distance", "dist");

    public FastFall() {
        super("Fast Fall", new String[]{"fastfall", "reversestep"}, ModuleCategory.MOVEMENT);
        offerProperties(speed, distance);
    }

    @Override
    public String getTag() {
        return String.valueOf(distance.getValue());
    }

    @EventListener
    public void onTick(EventTick event) {
        if (mc.thePlayer.onGround && !mc.thePlayer.isInWater() && !PlayerUtils.isOverLiquid() && !mc.thePlayer.isOnLadder() && !mc.gameSettings.keyBindJump.pressed) {
            for (double y = 0.0; y < distance.getValue().doubleValue() + 0.5; y += 0.01) {
                AxisAlignedBB bb = mc.thePlayer.boundingBox.copy().offset(0.0, -y, 0.0);
                if (!mc.theWorld.getCollidingBoundingBoxes(mc.thePlayer, mc.thePlayer.boundingBox.copy().offset(0.0, -y, 0.0)).isEmpty() && bb.minY > 0.0) {
                    mc.thePlayer.motionY = -speed.getValue().doubleValue();
                    break;
                }
            }
        }
    }
}
