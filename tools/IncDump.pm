package IncDump;
END { print STDERR "INC: ", join(" ", sort map { s{^Image/ExifTool/?}{}r } grep m{^Image/ExifTool}, keys %INC), "\n"; }
1;
