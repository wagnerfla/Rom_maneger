const fs = require('fs');

function lerPrimeirosBytes(caminho, quantidade) {
    const buffer = Buffer.alloc(quantidade);
    const fd = fs.openSync(caminho, 'r');
    fs.readSync(fd, buffer, 0, quantidade, 0);
    fs.closeSync(fd);
    return buffer;
};

function isISOValida(caminho) {
    try {
        const tamanho =fs.statSync(caminho).size;
        if (tamanho < 36864) return false;

        const buffer = Buffer.alloc(8);
        const fd = fs.openSync(caminho, 'r');
        fs.readSync(fd, buffer, 0, 8, 32769);
        fs.closeSync(fd);

        const assinatura = buffer.toString('ascii', 0, 5);
        return assinatura === 'CD001';

    } catch {
        return false;
    };
};


function isBINValida(caminho) {
    try {
        const tamanho = fs.statSync(caminho).size;
        if (tamanho < 2352) return false;

        const buffer = lerPrimeirosBytes(caminho, 16);
        const assinatura = [
            0x00, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0x00
        ];

        return assinatura.every((byte, i) => buffer[i] === byte);

    } catch {
        return false;
    };
};

function validarRom(caminho, extensao) {
    switch (extensao) {
        case '.iso': return isISOValida(caminho);
        case '.bin': return isBINValida(caminho);
        default: return true;
    };
};

module.exports = {validarRom};