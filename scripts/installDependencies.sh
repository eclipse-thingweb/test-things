#!/bin/bash

# Install dependencies for npm workspaces packages
npm ci

# Install dependencies for non-npm packages
for protocol_directory in things/*/*/* ; do
    current_path="$(pwd)"
    cd "$protocol_directory"

    # Install dependencies for poetry 
    if [ -f "poetry.lock" ]; then
        poetry install
    fi

    cd $current_path
done

exit 0
