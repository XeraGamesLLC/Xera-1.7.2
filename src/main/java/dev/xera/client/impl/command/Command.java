package dev.xera.client.impl.command;

import dev.xera.client.impl.command.arg.Argument;
import dev.xera.client.impl.command.arg.CommandContext;
import dev.xera.client.utils.client.Labeled;

public abstract class Command implements Labeled {
    private final String label;
    private final String[] aliases;
    private final Argument[] args;

    public Command(String[] aliases, Argument... args) {
        this.label = aliases[0];
        this.aliases = aliases;
        this.args = args;
    }

    public abstract String dispatch(CommandContext ctx);

    @Override
    public String getLabel() {
        return label;
    }

    @Override
    public String[] getAliases() {
        return aliases;
    }

    public Argument[] getArgs() {
        return args;
    }
}
