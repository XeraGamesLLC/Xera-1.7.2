package dev.xera.client.impl.module.visuals;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.render.EventGluPerspective;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class Aspect extends ToggleableModule {
    private final Property<Float> ratio = new Property<>(1.0f, 0.1f, 3.0f, "Ratio");

    public Aspect() {
        super("Aspect", new String[]{"aspectratio"}, ModuleCategory.VISUALS);
        offerProperties(ratio);
    }

    @EventListener
    public void onPerspective(EventGluPerspective event) {
        event.setAspect(ratio.getValue());
    }
}
