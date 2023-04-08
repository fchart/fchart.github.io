const formlog = document.getElementById("login-form");
const BtnLog = document.getElementById("login-form-submit");
const ErrorMessage = document.getElementById("login-error-msg");

var show_dialog = 0;
function dialog_box() {
    el = document.getElementById("dialog_example");
    el.style.visibility = (el.style.visibility == "visible") ? "hidden" : "visible";
    if (show_dialog == 1) {
        show_dialog == 0;
        window.location.href = "pricing.html";          
    }
}

BtnLog.addEventListener("click", (e) => {
    show_dialog = 0;  
    e.preventDefault();
    const username = formlog.username.value;
    const password = formlog.password.value;

    if (username === "joe" && password === "12345678") {
        // alert("你已經成功登入相片網站.");
        // location.reload();
        window.location.href = "album.html";
    } 
    else if (username === "mary" && password === "12345678") {
        alert("你已經成功登入我的自傳.");
        // location.reload();
        window.location.href = "profile.html";
    } 
    else if (username === "tom" && password === "12345678") {
        dialog_box(); 
        show_dialog = 1;        
    }    
    else {
        ErrorMessage.style.opacity = 1;
    }
})