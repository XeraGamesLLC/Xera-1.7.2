package dev.xera.client.impl.event.impl.xera;

import me.bush.eventbus.event.Event;
import dev.xera.client.impl.module.ToggleableModule;

public class EventModuleToggle extends Event {
    private final ToggleableModule module;

    public EventModuleToggle(ToggleableModule module) {
        this.module = module;
    }

    public ToggleableModule getModule() {
        return module;
    }

    @Override
    protected boolean isCancellable() {
        return false;
    }
}
