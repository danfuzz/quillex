#!/bin/bash
#
# Copyright 2016 the Quillex Authors (Dan Bornstein et alia).
# Licensed AS IS and WITHOUT WARRANTY under the Apache License,
# Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
#
# "Manually" tweak some code in imported modules, to fix bugs and/or provide
# new behavior. Called as `fix-modules <overlay-dir> <project-dir>` where the
# overlay directory is where all the replacement files live, and the project
# directory is one of the built subprojects under `out` (client or server).
#

#
# Argument parsing
#

# Where to find overlay files.
fromDir="$1"

# The project build directory to perform replacement in.
toDir="$2"

#
# Helper functions
#

# Performs overlaying of a single module.
function do-overlay {
    local name="$1"
    local fromMod="$2"
    local toMod="$3"

    echo ''
    echo "Overlaying module: ${name}"

    # Iterate over all the partial paths to overlaid files.
    local files=($(cd "${fromMod}"; find . -type f | cut -c 3- ))
    local expectSum fromSum toSum fromFile toFile
    for f in "${files[@]}"; do
        fromFile="${fromMod}/${f}"
        toFile="${toMod}/${f}"

        if [[ ! -e "${toFile}" ]]; then
            # New file in the overlay. (File doesn't exist in the original.)
            mkdir -p "$(dirname "${toFile}")" || return 1
            cp "${fromFile}" "${toFile}" || return 1
            echo "New: ${name}/${f}"
            continue
        fi

        fromSum="$(shasum "${fromFile}" | awk '{ print $1 }')"
        toSum="$(shasum "${toFile}" | awk '{ print $1 }')"

        if [[ ${fromSum} == ${toSum} ]]; then
            # Already copied or possibly updated upstream (but the latter is
            # unlikely).
            continue
        fi

        # Find the expected checksum in the checksums file, to make sure we're
        # overlaying the version we expect.
        expectSum="$(grep "${f}" "${fromDir}/checksums.txt" | awk '{ print $1 }')"
        if [[ ${expectSum} != ${toSum} ]]; then
            echo "Bad overlay version: ${name}/${f}"
            return 1
        fi

        cp "${fromFile}" "${toFile}" || return 1
        echo "Overlay: ${name}/${f}"
    done
}

#
# Main script
#

# Find all the `node_modules` directories in the existing built product,
# including ones buried inside other modules.
modules=($(
    find "${toDir}" -type d -path '*/node_modules/*' \
        | grep 'node_modules/[^/]*$'
))

# For each module in the built product, see if it is listed in the overlay
# directory. If it is, validate the versions of files to overlay, and overlay
# them.
for module in "${modules[@]}"; do
    name="$(basename "${module}")"
    fromMod="${fromDir}/${name}"

    if [[ ! -e "${fromMod}" ]]; then
        # Nothing for this one in the overlays.
        continue
    fi

    do-overlay "${name}" "${fromMod}" "${module}" || exit 1
done