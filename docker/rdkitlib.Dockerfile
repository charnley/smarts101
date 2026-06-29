FROM debian:trixie AS deps
RUN apt-get update 
RUN apt-get install -y cmake git python3 g++ nodejs wget xz-utils libboost-dev libeigen3-dev

WORKDIR /opt
RUN git clone https://github.com/emscripten-core/emsdk.git
WORKDIR /opt/emsdk
RUN ./emsdk install latest && ./emsdk activate latest
RUN echo "source /opt/emsdk/emsdk_env.sh > /dev/null 2>&1" >>~/.bashrc
SHELL ["/bin/bash", "-c", "-l"]

# Copy debian boost into emscripten sysroot
RUN EM_CACHE=$(em-config CACHE) \
    && mkdir -p ${EM_CACHE}/sysroot/include ${EM_CACHE}/sysroot/lib/cmake \
    && cp -r /usr/include/boost ${EM_CACHE}/sysroot/include/ \
    && cp -r /usr/lib/x86_64-linux-gnu/cmake/Boost-* ${EM_CACHE}/sysroot/lib/cmake/ \
    && cp -r /usr/lib/x86_64-linux-gnu/cmake/boost_headers-* ${EM_CACHE}/sysroot/lib/cmake/ \
    && find ${EM_CACHE}/sysroot/lib/cmake -name "*.cmake" \
        -exec sed -i "s|/usr/include|${EM_CACHE}/sysroot/include|g" {} \;

FROM deps AS builder
ARG RDKIT_DIR
COPY ${RDKIT_DIR} /src/rdkit
RUN source /opt/emsdk/emsdk_env.sh \
    && BOOST_DIR=$(find $(em-config CACHE)/sysroot/lib/cmake -name BoostConfig.cmake | head -1 | xargs dirname) \
    && cd /src/rdkit && rm -rf build-wasm && mkdir build-wasm && cd build-wasm \
    && emcmake cmake \
        -DRDK_BUILD_PYTHON_WRAPPERS=OFF -DRDK_BUILD_CPP_TESTS=OFF \
        -DRDK_BUILD_INCHI_SUPPORT=OFF -DRDK_BUILD_FREETYPE_SUPPORT=OFF \
        -DRDK_BUILD_COORDGEN_SUPPORT=OFF -DRDK_BUILD_SLN_SUPPORT=OFF -DRDK_BUILD_CHEMDRAW_SUPPORT=OFF \
        -DRDK_BUILD_MAEPARSER_SUPPORT=OFF \
        -DRDK_USE_BOOST_SERIALIZATION=OFF -DRDK_USE_BOOST_IOSTREAMS=OFF \
        -DRDK_OPTIMIZE_POPCNT=OFF -DRDK_BUILD_MINIMAL_LIB=ON \
        -DCMAKE_BUILD_TYPE=Release -DBoost_DIR="$BOOST_DIR" \
        -DCMAKE_CXX_FLAGS="-O3 -DNDEBUG" -DCMAKE_C_FLAGS="-O3 -DNDEBUG" \
        .. \
    && make -j$(nproc) SmilesParse GraphMol RDGeneral RDGeometryLib

ENV RDBASE=/src/rdkit
WORKDIR /src
