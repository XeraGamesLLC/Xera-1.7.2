package dev.xera.client.impl.command.impl;

import dev.xera.client.impl.command.Command;
import dev.xera.client.impl.command.arg.Argument;
import dev.xera.client.impl.command.arg.CommandContext;
import dev.xera.client.impl.command.arg.impl.StringArgument;
import dev.xera.client.impl.module.active.HUD;

public class Watermark extends Command {
    public Watermark() {
        super(new String[]{"watermark", "displayname"},
                new StringArgument("watermark"));
    }

    @Override
    public String dispatch(CommandContext ctx) {
        HUD.WATERMARK = (String) ctx.get("watermark").getValue();
        return "Set watermark.";
    }
}
