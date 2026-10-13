/* ==========================================================================
   AUTH UI - Login form (email+password) + Password change + User badge
   ========================================================================== */

var AuthUI = (function() {

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function renderLoginPage() {
    var app = document.querySelector('.app');
    if (!app) return;

    app.style.display = 'block';
    app.innerHTML = ''
      + '<div class="login-page">'
      + '  <div class="login-card">'
      + '    <div class="login-card__logo">AIOS</div>'
      + '    <div class="login-card__title">Cohort Fundamentals</div>'
      + '    <div class="login-card__tabs">'
      + '      <button class="login-card__tab active" data-tab="login">Entrar</button>'
      + '      <button class="login-card__tab" data-tab="signup">Criar conta</button>'
      + '    </div>'
      // ── Tab: Entrar ──
      + '    <div class="login-card__tab-content" id="tab-login">'
      + '      <div class="login-card__subtitle">Acesse com seu email e senha</div>'
      + '      <form class="login-card__form" id="login-form" method="post" action="javascript:void(0)">'
      + '        <input class="login-card__input" type="email" id="login-email" placeholder="seu@email.com" required autocomplete="email">'
      + '        <input class="login-card__input" type="password" id="login-password" placeholder="Senha" required autocomplete="current-password">'
      + '        <div class="login-card__error" id="login-error"></div>'
      + '        <button class="login-card__btn" type="submit" id="login-btn">Entrar</button>'
      + '      </form>'
      + '      <div class="login-card__forgot"><a href="#" id="forgot-link">Esqueci minha senha</a></div>'
      + '    </div>'
      // ── Tab: Criar conta ──
      + '    <div class="login-card__tab-content" id="tab-signup" style="display:none">'
      + '      <div class="login-card__subtitle">Crie sua conta gratuitamente</div>'
      + '      <form class="login-card__form" id="signup-form" method="post" action="javascript:void(0)">'
      + '        <input class="login-card__input" type="text" id="signup-name" placeholder="Seu nome" required autocomplete="name">'
      + '        <input class="login-card__input" type="email" id="signup-email" placeholder="seu@email.com" required autocomplete="email">'
      + '        <input class="login-card__input" type="password" id="signup-password" placeholder="Senha (min. 8 caracteres)" required minlength="8" autocomplete="new-password">'
      + '        <input class="login-card__input" type="password" id="signup-confirm" placeholder="Confirme a senha" required minlength="8" autocomplete="new-password">'
      + '        <div class="login-card__error" id="signup-error"></div>'
      + '        <button class="login-card__btn" type="submit" id="signup-btn">Criar conta</button>'
      + '      </form>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    // ── Tab switching ──
    var tabs = document.querySelectorAll('.login-card__tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.getAttribute('data-tab');
        document.getElementById('tab-login').style.display = target === 'login' ? '' : 'none';
        document.getElementById('tab-signup').style.display = target === 'signup' ? '' : 'none';
      });
    });

    // ── Forgot password link ──
    document.getElementById('forgot-link').addEventListener('click', function(e) {
      e.preventDefault();
      renderForgotPassword();
    });

    // ── Login form ──
    var form = document.getElementById('login-form');
    var emailInput = document.getElementById('login-email');
    var passInput = document.getElementById('login-password');
    var btn = document.getElementById('login-btn');
    var errorEl = document.getElementById('login-error');

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var email = emailInput.value.trim();
      var password = passInput.value;
      if (!email || !password) return;

      btn.disabled = true;
      btn.textContent = 'Verificando...';
      errorEl.classList.remove('active');

      try {
        var signInResult = await Auth.signInWithPassword(email, password);

        if (signInResult.error) {
          var msg = signInResult.error.message || '';
          if (msg.indexOf('Invalid login credentials') !== -1) {
            showLoginError(errorEl, btn, 'Email ou senha incorretos.');
          } else {
            showLoginError(errorEl, btn, msg || 'Erro ao entrar.');
          }
          return;
        }

        window.location.reload();

      } catch (err) {
        showLoginError(errorEl, btn, 'Erro ao entrar. Tente novamente.');
      }
    });

    // ── Signup form ──
    var signupForm = document.getElementById('signup-form');
    var signupName = document.getElementById('signup-name');
    var signupEmail = document.getElementById('signup-email');
    var signupPass = document.getElementById('signup-password');
    var signupConfirm = document.getElementById('signup-confirm');
    var signupBtn = document.getElementById('signup-btn');
    var signupError = document.getElementById('signup-error');

    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var name = signupName.value.trim();
      var email = signupEmail.value.trim();
      var password = signupPass.value;
      var confirm = signupConfirm.value;

      if (!name || !email || !password || !confirm) return;

      signupError.classList.remove('active');

      if (password.length < 8) {
        signupError.textContent = 'A senha deve ter pelo menos 8 caracteres.';
        signupError.classList.add('active');
        return;
      }

      if (password !== confirm) {
        signupError.textContent = 'As senhas não coincidem.';
        signupError.classList.add('active');
        return;
      }

      signupBtn.disabled = true;
      signupBtn.textContent = 'Criando conta...';

      try {
        var result = await Auth.signUp(email, password, name);

        if (result.error) {
          var msg = result.error.message || '';
          if (msg.indexOf('already registered') !== -1 || msg.indexOf('already been registered') !== -1) {
            showSignupError(signupError, signupBtn, 'Este email já possui uma conta. Use a aba Entrar.');
          } else {
            showSignupError(signupError, signupBtn, msg || 'Erro ao criar conta.');
          }
          return;
        }

        if (!result.data.session) {
          showSignupError(signupError, signupBtn, 'Conta criada! Verifique seu email para confirmar.');
          return;
        }

        window.location.reload();

      } catch (err) {
        showSignupError(signupError, signupBtn, 'Erro ao criar conta. Tente novamente.');
      }
    });
  }

  function showLoginError(errorEl, btn, msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('active');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }

  function showSignupError(errorEl, btn, msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('active');
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  }

  function renderForgotPassword() {
    var app = document.querySelector('.app');
    if (!app) return;

    app.style.display = 'block';
    app.innerHTML = ''
      + '<div class="login-page">'
      + '  <div class="login-card">'
      + '    <div class="login-card__logo">AIOS</div>'
      + '    <div class="login-card__title">Recuperar Senha</div>'
      + '    <div class="login-card__subtitle">Digite seu email para receber o link de recuperação</div>'
      + '    <form class="login-card__form" id="forgot-form" method="post" action="javascript:void(0)">'
      + '      <input class="login-card__input" type="email" id="forgot-email" placeholder="seu@email.com" required autocomplete="email">'
      + '      <div class="login-card__error" id="forgot-error"></div>'
      + '      <button class="login-card__btn" type="submit" id="forgot-btn">Enviar link de recuperação</button>'
      + '    </form>'
      + '    <div class="login-card__forgot"><a href="#" id="back-login">Voltar para o login</a></div>'
      + '  </div>'
      + '</div>';

    document.getElementById('back-login').addEventListener('click', function(e) {
      e.preventDefault();
      renderLoginPage();
    });

    var form = document.getElementById('forgot-form');
    var emailInput = document.getElementById('forgot-email');
    var btn = document.getElementById('forgot-btn');
    var errorEl = document.getElementById('forgot-error');

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var email = emailInput.value.trim();
      if (!email) return;

      btn.disabled = true;
      btn.textContent = 'Enviando...';
      errorEl.classList.remove('active');

      try {
        var result = await Auth.resetPasswordForEmail(email);
        if (result.error) throw result.error;
        renderResetSent(email);
      } catch (err) {
        errorEl.textContent = err.message || 'Erro ao enviar email de recuperação.';
        errorEl.classList.add('active');
        btn.disabled = false;
        btn.textContent = 'Enviar link de recuperação';
      }
    });
  }

  function renderResetSent(email) {
    var app = document.querySelector('.app');
    if (!app) return;

    app.style.display = 'block';
    app.innerHTML = ''
      + '<div class="login-page">'
      + '  <div class="login-card">'
      + '    <div class="login-card__logo">AIOS</div>'
      + '    <div class="login-card__title">Email Enviado</div>'
      + '    <div class="login-card__sent active">'
      + '      <div class="login-card__sent-icon">'
      + '        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
      + '      </div>'
      + '      <div class="login-card__sent-desc">Enviamos um link de recuperação para:</div>'
      + '      <div class="login-card__sent-email">' + esc(email) + '</div>'
      + '      <div class="login-card__sent-desc">Verifique sua caixa de entrada e spam.</div>'
      + '    </div>'
      + '    <div class="login-card__forgot" style="margin-top:1.5rem"><a href="#" id="back-login-2">Voltar para o login</a></div>'
      + '  </div>'
      + '</div>';

    document.getElementById('back-login-2').addEventListener('click', function(e) {
      e.preventDefault();
      renderLoginPage();
    });
  }

  function renderPasswordChange() {
    var app = document.querySelector('.app');
    if (!app) return;

    app.style.display = 'block';
    app.innerHTML = ''
      + '<div class="login-page">'
      + '  <div class="login-card">'
      + '    <div class="login-card__logo">AIOS</div>'
      + '    <div class="login-card__title">Redefinir Senha</div>'
      + '    <div class="login-card__subtitle">' + (Auth.isRecovery() ? 'Crie uma nova senha para sua conta' : 'Primeiro acesso — crie uma nova senha para sua conta') + '</div>'
      + '    <form class="login-card__form" id="password-form" method="post" action="javascript:void(0)">'
      + '      <input class="login-card__input" type="password" id="new-password" placeholder="Nova senha (min. 6 caracteres)" required minlength="6" autocomplete="new-password">'
      + '      <input class="login-card__input" type="password" id="confirm-password" placeholder="Confirme a nova senha" required minlength="6" autocomplete="new-password">'
      + '      <div class="login-card__error" id="password-error"></div>'
      + '      <button class="login-card__btn" type="submit" id="password-btn">Salvar nova senha</button>'
      + '    </form>'
      + '    <div class="login-card__footer">Sua senha inicial será substituída</div>'
      + '  </div>'
      + '</div>';

    var form = document.getElementById('password-form');
    var newPass = document.getElementById('new-password');
    var confirmPass = document.getElementById('confirm-password');
    var btn = document.getElementById('password-btn');
    var errorEl = document.getElementById('password-error');

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var np = newPass.value;
      var cp = confirmPass.value;

      errorEl.classList.remove('active');

      if (np.length < 8) {
        errorEl.textContent = 'A senha deve ter pelo menos 8 caracteres.';
        errorEl.classList.add('active');
        return;
      }
      if (np !== cp) {
        errorEl.textContent = 'As senhas não coincidem.';
        errorEl.classList.add('active');
        return;
      }
      if (np === '123456') {
        errorEl.textContent = 'Escolha uma senha diferente da senha inicial.';
        errorEl.classList.add('active');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Salvando...';

      try {
        var result = await Auth.updatePassword(np);
        if (result.error) throw result.error;
        window.location.reload();
      } catch (err) {
        errorEl.textContent = err.message || 'Erro ao atualizar senha.';
        errorEl.classList.add('active');
        btn.disabled = false;
        btn.textContent = 'Salvar nova senha';
      }
    });
  }

  function renderUserBadge(container) {
    var user = Auth.getUser();
    if (!user || !container) return;

    var existing = container.querySelector('.user-badge');
    if (existing) existing.remove();

    var email = user.email || '';
    var initials = email.substring(0, 2).toUpperCase();

    var badge = document.createElement('div');
    badge.className = 'user-badge';
    badge.innerHTML = ''
      + '<div class="user-badge__avatar">' + esc(initials) + '</div>'
      + '<div class="user-badge__info">'
      + '  <div class="user-badge__email">' + esc(email) + '</div>'
      + '</div>'
      + '<button class="user-badge__logout" title="Sair">Sair</button>';

    badge.querySelector('.user-badge__logout').addEventListener('click', function() {
      Auth.signOut();
    });

    container.appendChild(badge);
  }

  return {
    renderLoginPage: renderLoginPage,
    renderForgotPassword: renderForgotPassword,
    renderResetSent: renderResetSent,
    renderPasswordChange: renderPasswordChange,
    renderUserBadge: renderUserBadge
  };
})();
