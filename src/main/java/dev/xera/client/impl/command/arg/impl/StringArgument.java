package dev.xera.client.impl.command.arg.impl;

import dev.xera.client.impl.command.arg.Argument;

public class StringArgument extends Argument<String> {
    public StringArgument(String name) {
        super(name, String.class);
    }

    @Override
    public boolean parse(String part) {
        setValue(part);
        return true;
    }
}
