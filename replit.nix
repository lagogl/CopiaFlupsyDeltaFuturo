{pkgs}: {
  deps = [
    pkgs.chromium
    pkgs.lsof
    pkgs.zip
    pkgs.jq
    pkgs.postgresql
  ];
}
