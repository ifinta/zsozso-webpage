echo(version=version());

font = "Liberation Sans"; //["Liberation Sans", "Liberation Sans:style=Bold", "Liberation Sans:style=Italic", "Liberation Mono", "Liberation Serif"]

coin_size = 35;
bletter_size = 50;
letter_size = 10;
letter_height = 6;

module bletter(l) {
  // Use linear_extrude() to make the letters 3D objects as they
  // are only 2D shapes when only using text()
  linear_extrude(height = letter_height) {
    text(l, size = bletter_size, font = font, halign = "center", valign = "center", $fn = 16);
  }
}

module letter(l) {
  // Use linear_extrude() to make the letters 3D objects as they
  // are only 2D shapes when only using text()
  linear_extrude(height = letter_height) {
    text(l, size = letter_size, font = font, halign = "center", valign = "center", $fn = 16);
  }
}


translate([0,0,0]) difference() {
        linear_extrude(height = 10) {
        circle(coin_size);
    }

    translate([0,-10,5])letter("ZSOZSO");
    translate([0,0,7])bletter("1");
}