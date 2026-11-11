#!/usr/bin/env bash
# Genera los PNG del icono y del splash a partir de los SVG de assets/src/.
# Los SVG son la fuente: para cambiar el icono se tocan ellos y se vuelve a
# ejecutar esto. Necesita ImageMagick con librsvg (`magick -list format | grep RSVG`).
set -euo pipefail
cd "$(dirname "$0")/../assets"
render() { magick -background none -density 192 "src/$1.svg" -resize "${3}x${3}" "$2"; }
render icon icon.png 1024
render foreground android-icon-foreground.png 1024
render monochrome android-icon-monochrome.png 1024
render splash splash-icon.png 1024
# El icono principal no lleva transparencia: algunas tiendas y lanzadores la pintan de negro.
magick icon.png -background '#7A45C4' -alpha remove -alpha off icon.png
ls -l icon.png android-icon-foreground.png android-icon-monochrome.png splash-icon.png
