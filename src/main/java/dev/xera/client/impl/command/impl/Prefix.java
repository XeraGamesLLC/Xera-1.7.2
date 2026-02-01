package dev.xera.client.impl.command.impl;

import net.minecraft.util.EnumChatFormatting;
import dev.xera.client.core.XeraClient;
import dev.xera.client.impl.command.Command;
import dev.xera.client.impl.command.arg.CommandContext;
import dev.xera.client.impl.command.arg.impl.StringArgument;

public class Prefix extends Command {
    public Prefix() {
        super(new String[]{"prefix", "commandprefix", "cmdprefix"},
                new StringArgument("prefix"));
    }

    @Override
    public String dispatch(CommandContext ctx) {
        String newPrefix = (String) ctx.get("prefix").getValue();
        XeraClient.getInstance().getCommandManager().commandPrefix = newPrefix;
        return "Set the prefix to " + EnumChatFormatting.YELLOW + newPrefix + EnumChatFormatting.GRAY + ".";
    }
}
