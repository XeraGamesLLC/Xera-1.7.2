package dev.xera.client.impl.event.impl.render;

import dev.xera.client.impl.event.base.Era;
import dev.xera.client.impl.event.base.EventEraed;

public class EventRenderRotations extends EventEraed {
    public float yaw, pitch;

    public EventRenderRotations(Era era, float yaw, float pitch) {
        super(era);
        this.yaw = yaw;
        this.pitch = pitch;
    }

    @Override
    protected boolean isCancellable() {
        return true;
    }
}
