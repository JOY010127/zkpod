pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template SimplePod() {
    signal input secret;
    signal input hash;

    component hasher = Poseidon(1);
    hasher.inputs[0] <== secret;
    hash === hasher.out;
}

component main {public [hash]} = SimplePod();
