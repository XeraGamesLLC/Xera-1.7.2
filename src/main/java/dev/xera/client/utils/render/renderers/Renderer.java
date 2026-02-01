package dev.xera.client.utils.render.renderers;

import dev.xera.client.utils.client.Wrapper;
import dev.xera.client.utils.render.enums.Dimension;

public abstract class Renderer implements Wrapper {
    protected Dimension dimension;

    public abstract void render();

    public Renderer setDimension(Dimension dimension) {
        this.dimension = dimension;
        return this;
    }
}
