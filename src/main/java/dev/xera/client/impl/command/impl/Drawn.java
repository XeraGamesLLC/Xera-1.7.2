package dev.xera.client.impl.command.impl;

import net.minecraft.util.EnumChatFormatting;
import dev.xera.client.impl.command.Command;
import dev.xera.client.impl.command.arg.CommandContext;
import dev.xera.client.impl.command.arg.impl.ModuleArgument;
import dev.xera.client.impl.module.Module;
import dev.xera.client.impl.module.ToggleableModule;

public class Drawn extends Command {
    public Drawn() {
        super(new String[]{"drawn", "d", "seen"}, new ModuleArgument("name"));
    }

    @Override
    public String dispatch(CommandContext ctx) {
        Module module = (Module) ctx.get("name").getValue();
        if (module instanceof ToggleableModule) {
            ToggleableModule t = (ToggleableModule) module;
            t.setDrawn(!t.isDrawn());
            return "Set " + EnumChatFormatting.YELLOW + module.getLabel() + EnumChatFormatting.GRAY + " drawn to " + t.isDrawn() + ".";
        }

        return "This module is hidden by default.";
    }
}
