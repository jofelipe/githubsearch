//elementos no dom
var inputUser = document.querySelector('.input-user');
var inputEmail = document.querySelector('.input-email');
var btnSearch = document.querySelector('.btn-search');
var qrcode = document.querySelector('.qrcode');
var inputKey = document.querySelector('.input-key');
var btnLogin = document.querySelector('.btn-login');
var reset = document.querySelector('.reset-app');

const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
var googleKey = null;

//funcao para gerar uma string aleatoria a cada novo acesso
function customString() {
    var string = '';
    for (var i = 0; i < 16; i++) {
        string += base32chars.charAt(Math.floor(Math.random() * 16));
    }
    return string;
}
var customString = customString();

//converter decimal para hexadecimal e vice-versa
function dec2hex(s) { return (s < 15.5 ? '0' : '') + Math.round(s).toString(16); }
function hex2dec(s) { return parseInt(s, 16); }

//funcao para converter string base32 em hexadecimal
function base32tohex(base32) {
    var bits = '';
    var hex = '';

    for (var i = 0; i < base32.length; i++) {
        var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        bits += leftpad(val.toString(2), 5, '0');
    }

    for (var i = 0; i+4 <= bits.length; i+=4) {
        var chunk = bits.substr(i, 4);
        hex = hex + parseInt(chunk, 2).toString(16) ;
    }
    return hex;
}

function leftpad(str, len, pad) {
    if (len + 1 >= str.length) {
        str = Array(len + 1 - str.length).join(pad) + str;
    }
    return str;
}

//funcao para gerar e atualizar a key
function updateOtp() {
    
    //gero uma key com base em uma string aleatoria
    var key = base32tohex(customString);
    var epoch = Math.round(new Date().getTime() / 1000.0);
    var time = leftpad(dec2hex(Math.floor(epoch / 30)), 16, '0');

    // criptografando a string com SHA-1 (utilizando a biblioteca jsSHA)
    var shaObj = new jsSHA('SHA-1', 'HEX');
    shaObj.setHMACKey(key, 'HEX');
    shaObj.update(time);
    var hmac = shaObj.getHMAC('HEX');
    var offset = hex2dec(hmac.substring(hmac.length - 1));

    //converte e trata a key
    googleKey = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + '';
    googleKey = (googleKey).substr(googleKey.length - 6, 6);

    //console.log(googleKey);
}

//gerar uma nova key a cada 30 segundos (conforme google authenticator)
function timer() {
    var epoch = Math.round(new Date().getTime() / 1000.0);
    if (epoch % 30 == 0) updateOtp();  
}
setInterval(timer, 1000);

//função disparada apos validação da primeira etapa
function secondStep() {

    //atualiza a key
    updateOtp();

    //cria o elemento de imagem e atribue o src
    //importante associar o codigo a um e-mail para uso em celulares diferentes
    qrcode.setAttribute('src', 'https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=150x150&chld=M|0&cht=qr&chl=otpauth://totp/' + inputEmail.value + '%3Fsecret%3D' + customString);

    //exibe a div para autenticação da key
    document.querySelector('#step1').style.display = 'none';
    document.querySelector('#step2').style.display = 'block';

}

//funcao ao clicar em pesquisar
btnSearch.onclick = function() {

    //validacao
    if(inputUser.value === '') {
        //exibir mensagem de erro
        document.querySelector('#step1 .error-message').innerHTML = '';
        var errorMessage = document.createTextNode('Digite um usuário');
		document.querySelector('#step1 .error-message').appendChild(errorMessage);
		document.querySelector('#step1 .error-message').className += ' active';
    } else if (inputEmail.value === '') {
        document.querySelector('#step1 .error-message').innerHTML = '';
        var errorMessage = document.createTextNode('Digite seu e-mail');
		document.querySelector('#step1 .error-message').appendChild(errorMessage);
		document.querySelector('#step1 .error-message').className += ' active';
    } else {
        //feedback para o usuario
		btnSearch.className += ' is-loading';

        //verifica se o usuario existe
        var url = 'https://api.github.com/users/' + inputUser.value;
        
        //usando promise (com axios) para fazer a requisição
        axios.get(url)
            .then( function(response) {
                btnSearch.classList.remove('is-loading');
                //caso exista, chama a segunda etapa
                secondStep();
            })
            .catch( function(error) {
                if(error.response.status === 404) {
                    //exibir mensagem de erro
                    document.querySelector('#step1 .error-message').innerHTML = '';
                    var errorMessage = document.createTextNode('Usuário não existe');
					document.querySelector('#step1 .error-message').appendChild(errorMessage);
					document.querySelector('#step1 .error-message').className += ' active';
                } else {
                    //exibir mensagem de erro
                    document.querySelector('#step1 .error-message').innerHTML = '';
                    var errorMessage = document.createTextNode('Erro na requisição');
					document.querySelector('#step1 .error-message').appendChild(errorMessage);
					document.querySelector('#step1 .error-message').className += ' active';
                }
            });
    }
    
}

//funcao disparada apos validacao da key
function loginSuccessful() {

    //usando promise (com axios) para fazer a requisição
    var url = 'https://api.github.com/users/' + inputUser.value;
    axios.get(url)
        .then( function(response) {
			btnLogin.classList.remove('is-loading');
            
            //monta a tela do usuario
            document.querySelector('.user-profile img').setAttribute('src', response.data.avatar_url);
            var userName = document.createTextNode(response.data.name);
            document.querySelector('.user-profile h2').appendChild(userName);

            //caso o usuário tenha biografia
            if(response.data.bio != null) {
				var userBio = document.createTextNode(response.data.bio);
                document.querySelector('.user-profile .bio').appendChild(userBio);
            }            

            var userRepos = document.createTextNode(response.data.public_repos);
            document.querySelector('.user-profile .repos').appendChild(userRepos);
            var userFollowers = document.createTextNode(response.data.followers);
            document.querySelector('.user-profile .followers').appendChild(userFollowers);
            var userFollowing = document.createTextNode(response.data.following);
            document.querySelector('.user-profile .following').appendChild(userFollowing);
        })
        .catch( function(error) {
            //oculta a tela do usuario
            document.querySelector('.user-profile').style.display = 'none';
            //exibir mensagem de erro
            document.querySelector('#step3 .error-message').innerHTML = '';
            var errorMessage = document.createTextNode('Erro na requisição');
			document.querySelector('#step3 .error-message').appendChild(errorMessage);
			document.querySelector('#step3 .error-message').className += ' active';
        });

    //exibe a div do usuario
    document.querySelector('#step2').style.display = 'none';
    document.querySelector('#step3').style.display = 'block';
}

//funcao ao logar
btnLogin.onclick = function() {
    if(inputKey.value === '') {
        //exibir mensagem de erro
        document.querySelector('#step2 .error-message').innerHTML = '';
        var errorMessage = document.createTextNode('Digite o código de verificação');
		document.querySelector('#step2 .error-message').appendChild(errorMessage);
		document.querySelector('#step2 .error-message').className += ' active';
    } else if (inputKey.value === googleKey) {
        //feedback para o usuario
		btnLogin.className += ' is-loading';

        //chama a funcao de sucesso na autenticacao
        loginSuccessful();
    } else {
        //exibir mensagem de erro
        document.querySelector('#step2 .error-message').innerHTML = '';
        var errorMessage = document.createTextNode('Código de verificação incorreto ou expirado');
		document.querySelector('#step2 .error-message').appendChild(errorMessage);
		document.querySelector('#step2 .error-message').className += ' active';
    }
}

//resetar e pesquisar por um novo usuario
reset.onclick = function() {

    //ocultar todas as divs com class "step" usando javascript puro
    var stepClasses = document.querySelectorAll('.step');
    for (var i = 0; i < stepClasses.length; i++) {
        stepClasses[i].style.display = 'none';
    }

    document.querySelector('#step1').style.display = 'block';
    inputUser.value = '';
    inputUser.focus();
    inputKey.value = '';
    document.querySelector('.user-profile img').setAttribute('src', '');
    document.querySelector('.user-profile h2').innerHTML = '';
    document.querySelector('.user-profile .bio').innerHTML = '';
    document.querySelector('.user-profile .repos').innerHTML = '';
    document.querySelector('.user-profile .followers').innerHTML = '';
    document.querySelector('.user-profile .following').innerHTML = '';
}
