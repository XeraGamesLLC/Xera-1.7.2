package dev.xera.client.impl.module.miscellaneous;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.api.property.Property;
import dev.xera.client.core.XeraClient;
import dev.xera.client.impl.event.impl.move.EventMotionUpdate;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.utils.client.MathUtils;

public class AntiAim extends ToggleableModule {
    private final Property<Pitch> pitch = new Property<>(Pitch.OFF, "Pitch", "p");
    private final Property<Yaw> yaw = new Property<>(Yaw.SPIN, "Yaw", "y");
    private final Property<Boolean> server = new Property<>(true, "Server", "silent");
    private final Property<Float> speed = new Property<>(2.5f, 0.1f, 50.0f, "Speed", "s");

    public AntiAim() {
        super("Anti Aim", new String[]{"antiaim", "noaim", "derp", "retard"}, ModuleCategory.MISCELLANEOUS);
        offerProperties(pitch, yaw, server, speed);
    }

    @EventListener
    public void onMotionUpdate(EventMotionUpdate event) {
        float[] rotations = XeraClient.getInstance().getRotationManager().getServerRotation();
        if (!server.getValue()) {
            rotations = new float[] { mc.thePlayer.rotationYaw, mc.thePlayer.rotationPitch };
        }

        switch (pitch.getValue()) {
            case OFF: {
                rotations[1] = mc.thePlayer.rotationPitch;
                break;
            }

            case INVALID: {
                rotations[1] += speed.getValue();
                break;
            }

            case ZERO: {
                rotations[1] = 0.0f;
                break;
            }

            case SKY: {
                rotations[1] = -90.0f;
                break;
            }

            case RANDOM: {
                float rand = MathUtils.random(-90, 90);
                rotations[1] = rand;
                break;
            }
        }

        switch (yaw.getValue()) {
            case OFF: {
                rotations[0] = mc.thePlayer.rotationYaw;
                break;
            }

            case SPIN: {
                rotations[0] += speed.getValue();
                break;
            }

            case RANDOM: {
                float rand = MathUtils.random(0, 360);
                rotations[0] = rand;
                break;
            }
        }

        if (server.getValue()) {
            XeraClient.getInstance().getRotationManager().setRotations(rotations);
        } else {
            mc.thePlayer.rotationYaw = rotations[0];
            mc.thePlayer.rotationYawHead = rotations[0];
            mc.thePlayer.rotationPitch = rotations[1];
        }
    }

    public enum Pitch {
        OFF, ZERO, SKY, RANDOM, INVALID
    }

    public enum Yaw {
        OFF, SPIN, RANDOM
    }
}
