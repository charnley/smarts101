RDBASE ?= /src/rdkit
RDKIT_LIB ?= $(RDBASE)/build-wasm

CC = em++
CFLAGS = -std=c++20 -O3 -Wall \
         -s MODULARIZE=1 -s EXPORT_ES6=1 \
         -s EXPORT_NAME='initSmarterSmartsModule' \
         -s ALLOW_MEMORY_GROWTH=1 --bind \
         --emit-tsd smarter-smarts.d.ts

LDRDKIT = -I $(RDBASE)/Code -I $(RDBASE)/External \
          -I $(RDBASE)/External/RingFamilies/RingDecomposerLib/src/RingDecomposerLib \
          -L $(RDKIT_LIB)/lib

FLAGSRDKIT = -lRDKitSmilesParse -lRDKitGraphMol -lRDKitRDGeometryLib -lRDKitRDGeneral

RDKIT_SRC = $(RDBASE)/Code
SRCS = src/smarter-smarts.cpp \
       $(RDKIT_SRC)/GraphMol/Substruct/SubstructMatch.cpp \
       $(RDKIT_SRC)/GraphMol/Substruct/SubstructUtils.cpp \
       $(RDKIT_SRC)/GraphMol/GenericGroups/GenericGroups.cpp

all: smarter-smarts.js

smarter-smarts.js: $(SRCS)
	$(CC) $(CFLAGS) $(LDRDKIT) -o $@ $(SRCS) $(FLAGSRDKIT)

clean:
	rm -f smarter-smarts.js smarter-smarts.wasm
