window.addEventListener('load', ()=>{
    $('#userSettingsButton').click(()=>{
        $('#centralContainer').toggleClass('rotate180');
    });

    $('#playerViewButton').click(()=>{
        $('#centralContainer').toggleClass('rotate180');
    });

})

// Linear congruential generator
class LCG{
    seed;
    current;

    modulus = BigInt(2**31);
    modulusminusone = Number(this.modulus - 1n);
    multiplier = 1103515245n;
    increment = 12345n;
    inverse = 1857678181n;

    constructor(seed = Date.now()){
        this.seed = BigInt(seed) % this.modulus;
        this.current = this.seed;
    }

    next(){
        this.current = ( this.multiplier*this.current + this.increment) % this.modulus;
        return this.current;
    }

    previous(){
        this.current = ((( this.current - this.increment) * this.inverse) + this.modulus)  % this.modulus;
        return this.current;
    }

    nextFloat(){
        return Number(this.next()) / this.modulusminusone
    }

    previousFloat(){
        return Number(this.previous()) / this.modulusminusone
    }
}
