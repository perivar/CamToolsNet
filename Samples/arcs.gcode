;http://www.helmancnc.com/cnc-milling-circular-interpolation-program-example/
G90
G00 X-1.0 Y-1.0                     ; point S
G01 X0 Y0 F7.5                      ; point A
Y2.134                              ; point B
G03 X0.5 Y3.0 I-0.5 J0.866          ; point C
X0. Y3.866 I-1. J0                  ; point D
G01 Y5.5                            ; point E
G02 X0.5 Y6.0 I0.5 J0               ; point F
G01 X4.5                            ; point G
G02 X6.0 Y4.5 I0 J-1.5              ; point H
G01 Y0                              ; point I
X0                                  ; point A
G00 X-1.0 Y-1.0                     ; point S