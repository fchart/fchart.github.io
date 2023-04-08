const formlog = document.getElementById("login-form");
const BtnLog = document.getElementById("login-form-submit");
const ErrorMessage = document.getElementById("login-error-msg");

BtnLog.addEventListener("click", (e) => {
    e.preventDefault();
    const username = formlog.username.value;
    const password = formlog.password.value;

    if (username === "joe" && password === "12345678") {
        alert("你已經成功登入相片網站.");
        // location.reload();
        window.location.href = "album.html"
    } 
    else if (username === "mary" && password === "12345678") {
        alert("你已經成功登入我的自傳.");
        // location.reload();
        window.location.href = "profile.html"
    } 
    else {
        ErrorMessage.style.opacity = 1;
    }
})