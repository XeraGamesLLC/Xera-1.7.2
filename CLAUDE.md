# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Build the client JAR (outputs to build/libs/XeraClient-1.0.0.jar)
./gradlew build

# Or use the batch file on Windows
build.bat

# Clean build
./gradlew clean build
```

The JAR is a jarmod that replaces the vanilla 1.7.2 Minecraft jar.

## Architecture Overview

### Core Singleton
`dev.xera.client.core.XeraClient` is the main entry point:
- `XeraClient.getInstance()` - Access client instance
- `XeraClient.BUS` - EventBus for all module/event communication
- `XeraClient.LOGGER` - Log4j logger
- Initialized via `XeraClient.launch()` called from Minecraft's startup

### Module System

**Base Classes** (`dev.xera.client.impl.module`):
- `Module` - Base class with properties, config serialization, always subscribed to event bus
- `ToggleableModule` - Extends Module, adds enable/disable, keybinding, subscribes to bus only when enabled

**Creating a Module:**
```java
public class MyModule extends ToggleableModule {
    private final Property<Double> speed = new Property<>(1.0, 0.1, 10.0, "Speed");

    public MyModule() {
        super("MyModule", new String[]{"alias"}, ModuleCategory.MOVEMENT);
        offerProperties(speed);  // Register properties for config/GUI
    }

    @EventListener
    public void onTick(EventTick event) {
        // Module logic - only runs when enabled
    }
}
```

Modules are registered in `ModuleManager` constructor.

### Event System

Uses `com.github.therealbush:eventbus`. Events are in `dev.xera.client.impl.event.impl/`:
- `client/` - EventTick, EventAddChatMessage
- `move/` - EventMotion, EventMotionUpdate, EventStep
- `network/` - EventPacket (for packet interception)
- `render/` - EventRender2D, EventRender3D
- `player/` - EventUpdate, EventAttack

Subscribe with `@EventListener` annotation. Events with `Era` (PRE/POST) can be cancelled.

### Property System

`dev.xera.client.api.property.Property<T>` provides type-safe settings:
```java
Property<Boolean> toggle = new Property<>(true, "Toggle");
Property<Double> range = new Property<>(4.0, 1.0, 6.0, "Range");  // with min/max
Property<Mode> mode = new Property<>(Mode.ONE, "Mode");  // enums for dropdowns
```

Properties auto-save to JSON config and appear in ClickGUI.

### Minecraft Integration

Modified Minecraft classes are in `net.minecraft.*`. Client hooks are injected at:
- `Minecraft.java` - Calls `XeraClient.launch()` on startup
- `EntityPlayerSP.java` / `EntityClientPlayerMP.java` - Motion/update events
- `NetworkManager.java` - Packet events
- `EntityRenderer.java` - Render events
- `GuiIngame.java` - HUD rendering

### Wrapper Interface

`dev.xera.client.utils.client.Wrapper` provides quick access:
```java
public class MyModule extends ToggleableModule implements Wrapper {
    // mc field available - Minecraft.getMinecraft()
    // print(String) - send chat message with [Xera] prefix
    // isNull() - check if player/world is null
}
```

### Configuration

Configs stored in `./Xera Client/` directory (Minecraft root). `ConfigManager` handles load/save on startup/shutdown.

### Resources

Client assets at `src/main/resources/assets/minecraft/xera/`:
- Load via `new ResourceLocation("xera/textures/example.png")`
