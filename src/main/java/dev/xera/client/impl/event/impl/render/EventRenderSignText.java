package dev.xera.client.impl.event.impl.render;

import me.bush.eventbus.event.Event;

public class EventRenderSignText extends Event {
    @Override
    protected boolean isCancellable() {
        return true;
    }
}
