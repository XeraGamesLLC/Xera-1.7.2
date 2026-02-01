package dev.xera.client.impl.module;

import com.google.gson.JsonObject;
import org.lwjgl.input.Keyboard;
import dev.xera.client.core.XeraClient;
import dev.xera.client.impl.event.impl.xera.EventModuleToggle;

public class ToggleableModule extends Module {

    private boolean running = false;
    private boolean drawn = true;
    private int bind = Keyboard.KEY_NONE;

    public ToggleableModule(String label, String[] aliases, ModuleCategory category) {
        super(label, aliases, category);
    }

    protected void onEnable() {

    }

    protected void onDisable() {

    }

    public void setRunning(boolean running) {
        this.running = running;

        XeraClient.BUS.post(new EventModuleToggle(this));

        if (running) {
            onEnable();
            XeraClient.BUS.subscribe(this);
        } else {
            onDisable();
            XeraClient.BUS.unsubscribe(this);
        }
    }

    public boolean isRunning() {
        return running;
    }

    public boolean isDrawn() {
        return drawn;
    }

    public void setDrawn(boolean drawn) {
        this.drawn = drawn;
    }

    public void setBind(int bind) {
        this.bind = bind;
    }

    public int getBind() {
        return bind;
    }

    @Override
    public JsonObject toConfig() {
        JsonObject obj = super.toConfig();

        obj.addProperty("running", running);
        obj.addProperty("drawn", drawn);
        obj.addProperty("bind", bind);

        return obj;
    }

    @Override
    public void fromConfig(JsonObject object) {
        super.fromConfig(object);

        if (object.has("running")) {
            boolean b = object.get("running").getAsBoolean();
            if (b != running) {
                setRunning(b);
            }
        }

        if (object.has("drawn")) {
            setDrawn(object.get("drawn").getAsBoolean());
        }

        if (object.has("bind")) {
            setBind(object.get("bind").getAsInt());
        }
    }
}
