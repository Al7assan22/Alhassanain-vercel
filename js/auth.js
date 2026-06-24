// ===== FIREBASE AUTH SYSTEM — منصة الحَسَنَيْن =====

(function() {

  // ── Firebase Config ──────────────────────────────────────────────────────
  var firebaseConfig = {
    apiKey: "AIzaSyCiuT38piCcnTnrrfGTlJdssyM0N76Bn5k",
    authDomain: "alhasanain.firebaseapp.com",
    databaseURL: "https://alhasanain-default-rtdb.firebaseio.com",
    projectId: "alhasanain",
    storageBucket: "alhasanain.firebasestorage.app",
    messagingSenderId: "452753921770",
    appId: "1:452753921770:web:fc3e8b2edce6291091e993"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // ── Error Map ────────────────────────────────────────────────────────────
  function mapError(code) {
    var map = {
      "auth/email-already-in-use":   "هذا البريد الإلكتروني مسجل بالفعل.",
      "auth/invalid-email":          "البريد الإلكتروني غير صالح.",
      "auth/weak-password":          "كلمة المرور ضعيفة (8 أحرف على الأقل).",
      "auth/wrong-password":         "كلمة المرور غير صحيحة.",
      "auth/user-not-found":         "لا يوجد حساب بهذا البريد الإلكتروني.",
      "auth/invalid-credential":     "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "auth/too-many-requests":      "تم تجاوز عدد المحاولات. حاول لاحقاً.",
      "auth/network-request-failed": "فشل الاتصال. تحقق من الإنترنت.",
      "auth/popup-closed-by-user":   "",
      "auth/popup-blocked":          "تم حجب النافذة المنبثقة. سيتم التحويل لصفحة Google.",
      "auth/requires-recent-login":  "أعد تسجيل الدخول لإجراء هذه العملية.",
    };
    return map[code] || ("حدث خطأ: " + code);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function setLoading(btnId, on) {
    var btn = $(btnId); if (!btn) return;
    btn.disabled = on;
    var t = btn.querySelector(".btn-text");
    var l = btn.querySelector(".btn-loader");
    if (t) t.style.display = on ? "none" : "";
    if (l) l.style.display = on ? "inline" : "none";
  }

  function showError(id, msg) {
    var el = $(id); if (!el || !msg) return;
    el.textContent = msg;
    el.classList.add("show");
  }

  function clearMsg(id) {
    var el = $(id); if (!el) return;
    el.textContent = "";
    el.classList.remove("show");
  }

  function showSuccess(id, msg) {
    var el = $(id); if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
  }

  function getInitial(name) {
    return (name && name.trim()) ? name.trim()[0].toUpperCase() : "?";
  }

  function showToast(msg, type) {
    var toast = $("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "toast toast-" + (type || "info") + " show";
    clearTimeout(toast._t);
    toast._t = setTimeout(function() { toast.classList.remove("show"); }, 4000);
  }

  // ── Update UI after login/logout ─────────────────────────────────────────
  // Returns the first name only (first word)
  function getFirstName(name) {
    if (!name || !name.trim()) return "";
    return name.trim().split(/\s+/)[0];
  }

  function updateUserUI(user) {
    var loginBtn    = $("auth-login-btn");
    var userWrapper = $("user-menu-wrapper");
    var avatarDisp  = $("user-avatar-display");
    var dispName    = $("user-display-name");
    var dropAvatar  = $("dropdown-avatar-big");
    var dropName    = $("dropdown-username-text");
    var dropEmail   = $("dropdown-email-text");

    if (user) {
      var fullName = user.displayName || user.email.split("@")[0];
      var name    = getFirstName(fullName); // Show first name only
      var initial = getInitial(name);
      if (loginBtn)    loginBtn.style.display    = "none";
      if (userWrapper) userWrapper.style.display = "block";
      if (avatarDisp)  avatarDisp.textContent    = initial;
      if (dispName)    dispName.textContent      = name;          // First name only
      if (dropAvatar)  dropAvatar.textContent    = initial;
      if (dropName)    dropName.textContent      = fullName;      // Full name in dropdown
      if (dropEmail)   dropEmail.textContent     = user.email;
    } else {
      if (loginBtn)    loginBtn.style.display    = "flex";
      if (userWrapper) userWrapper.style.display = "none";
      closeDropdown();
    }
  }

  // ── Handle Google Redirect Result on page load ───────────────────────────
  auth.getRedirectResult().then(function(result) {
    if (result && result.user) {
      updateUserUI(result.user);
      var name = result.user.displayName || result.user.email.split("@")[0];
      showToast("أهلاً " + name + "! تم الدخول بـ Google ✓", "success");
    }
  }).catch(function(err) {
    // Suppress environment errors (e.g. running from file:// locally)
    var silentCodes = [
      "auth/popup-closed-by-user",
      "auth/operation-not-supported-in-this-environment",
      "auth/unauthorized-domain"
    ];
    if (err.code && silentCodes.indexOf(err.code) === -1) {
      showToast(mapError(err.code), "error");
    }
  });

  // ── Dropdown ─────────────────────────────────────────────────────────────
  function closeDropdown() {
    var d = $("user-dropdown");
    if (d) d.classList.remove("open");
  }

  window.toggleUserDropdown = function() {
    var d = $("user-dropdown");
    if (d) d.classList.toggle("open");
  };

  document.addEventListener("click", function(e) {
    var w = $("user-menu-wrapper");
    if (w && !w.contains(e.target)) closeDropdown();
  });

  // ── Auth Modal ────────────────────────────────────────────────────────────
  window.openAuthModal = function(panel) {
    var overlay = $("auth-overlay");
    if (!overlay) return;
    window.switchPanel(panel || "login");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(function() {
      var inp = overlay.querySelector("#panel-" + (panel || "login") + " input");
      if (inp) inp.focus();
    }, 300);
  };

  window.closeAuthModal = function() {
    var o = $("auth-overlay");
    if (o) o.classList.remove("open");
    document.body.style.overflow = "";
    ["login-error","signup-error","forgot-error","forgot-success"].forEach(clearMsg);
  };

  window.closeAuthOnOverlay = function(e) {
    if (e.target === $("auth-overlay")) window.closeAuthModal();
  };

  window.switchPanel = function(name) {
    ["login","signup","forgot"].forEach(function(p) {
      var el = $("panel-" + p);
      if (el) el.style.display = (p === name) ? "block" : "none";
    });
    ["login-error","signup-error","forgot-error","forgot-success"].forEach(clearMsg);
    // Auto-focus first input
    setTimeout(function() {
      var inp = $("panel-" + name) && $("panel-" + name).querySelector("input");
      if (inp) inp.focus();
    }, 50);
  };

  // ── Password Visibility ───────────────────────────────────────────────────
  window.togglePasswordVis = function(inputId, btn) {
    var inp = $(inputId); if (!inp) return;
    var show = inp.type === "password";
    inp.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁";
  };

  // ── Password Strength ─────────────────────────────────────────────────────
  document.addEventListener("input", function(e) {
    if (e.target.id !== "signup-password") return;
    var val = e.target.value;
    var bar = $("strength-fill");
    var lbl = $("strength-label");
    if (!bar || !lbl) return;
    var score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    var levels = [
      {w:"0%",   c:"transparent", t:""},
      {w:"25%",  c:"#e05555",     t:"ضعيفة جداً"},
      {w:"50%",  c:"#e08c20",     t:"مقبولة"},
      {w:"75%",  c:"#d4c020",     t:"جيدة"},
      {w:"100%", c:"#4caf7d",     t:"قوية جداً ✓"},
    ];
    var lvl = val.length === 0 ? levels[0] : levels[Math.min(score, 4)];
    bar.style.width      = lvl.w;
    bar.style.background = lvl.c;
    lbl.textContent      = lvl.t;
    lbl.style.color      = lvl.c;
  });

  // ── ENTER KEY — submit active panel ──────────────────────────────────────
  document.addEventListener("keydown", function(e) {
    if (e.key !== "Enter") return;

    // Main auth modal
    var authOverlay = $("auth-overlay");
    if (authOverlay && authOverlay.classList.contains("open")) {
      var loginPanel  = $("panel-login");
      var signupPanel = $("panel-signup");
      var forgotPanel = $("panel-forgot");
      if (loginPanel  && loginPanel.style.display  !== "none") { e.preventDefault(); window.handleLogin(); }
      if (signupPanel && signupPanel.style.display !== "none") { e.preventDefault(); window.handleSignup(); }
      if (forgotPanel && forgotPanel.style.display !== "none") { e.preventDefault(); window.handleForgotPassword(); }
      return;
    }
    // Edit username modal
    var editOverlay = $("edit-username-overlay");
    if (editOverlay && editOverlay.classList.contains("open")) {
      e.preventDefault(); window.handleEditUsername(); return;
    }
    // Change password modal
    var passOverlay = $("change-pass-overlay");
    if (passOverlay && passOverlay.classList.contains("open")) {
      e.preventDefault(); window.handleChangePassword(); return;
    }
  });

  // ── ESC KEY ───────────────────────────────────────────────────────────────
  document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape") return;
    window.closeAuthModal();
    window.closeEditUsername();
    window.closeChangePassword();
    closeDropdown();
  });

  // ── SIGN UP ───────────────────────────────────────────────────────────────
  window.handleSignup = function() {
    clearMsg("signup-error");
    var firstName = ($("signup-firstname") || {value:""}).value.trim();
    var lastName  = ($("signup-lastname")  || {value:""}).value.trim();
    var username  = firstName && lastName ? firstName + " " + lastName : (firstName || lastName);
    var email    = ($("signup-email")    || {value:""}).value.trim();
    var pass     = ($("signup-password") || {value:""}).value;
    var confirm  = ($("signup-confirm")  || {value:""}).value;

    if (!firstName)           return showError("signup-error","يرجى إدخال الاسم الأول.");
    if (firstName.length < 2) return showError("signup-error","الاسم الأول يجب أن يكون حرفين على الأقل.");
    if (!lastName)            return showError("signup-error","يرجى إدخال الاسم الأخير.");
    if (lastName.length < 2)  return showError("signup-error","الاسم الأخير يجب أن يكون حرفين على الأقل.");
    if (!email)               return showError("signup-error","يرجى إدخال البريد الإلكتروني.");
    if (!pass)                return showError("signup-error","يرجى إدخال كلمة المرور.");
    if (pass.length < 8)      return showError("signup-error","كلمة المرور 8 أحرف على الأقل.");
    if (pass !== confirm)     return showError("signup-error","كلمتا المرور غير متطابقتين.");

    setLoading("signup-submit-btn", true);
    auth.createUserWithEmailAndPassword(email, pass)
      .then(function(cred) {
        return cred.user.updateProfile({ displayName: username }).then(function() { return cred.user; });
      })
      .then(function(user) {
        // Save email to DB so we can check it in forgot-password
        if (db) {
          var safeKey = email.replace(/\./g, ',');
          db.ref('emails/' + safeKey).set(true).catch(function(){});
          db.ref('users/' + user.uid).update({ email: email }).catch(function(){});
        }
        updateUserUI(user);
        window.closeAuthModal();
        showToast("أهلاً " + firstName + "! تم إنشاء حسابك بنجاح 🌟", "success");
      })
      .catch(function(err) { showError("signup-error", mapError(err.code)); })
      .finally(function() { setLoading("signup-submit-btn", false); });
  };

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  window.handleLogin = function() {
    clearMsg("login-error");
    var email = ($("login-email")    || {value:""}).value.trim();
    var pass  = ($("login-password") || {value:""}).value;

    if (!email) return showError("login-error","يرجى إدخال البريد الإلكتروني.");
    if (!pass)  return showError("login-error","يرجى إدخال كلمة المرور.");

    setLoading("login-submit-btn", true);
    auth.signInWithEmailAndPassword(email, pass)
      .then(function(cred) {
        updateUserUI(cred.user);
        window.closeAuthModal();
        var name = cred.user.displayName || cred.user.email.split("@")[0];
        showToast("مرحباً " + name + " 🌙", "success");
      })
      .catch(function(err) { showError("login-error", mapError(err.code)); })
      .finally(function() { setLoading("login-submit-btn", false); });
  };

  // ── GOOGLE LOGIN ──────────────────────────────────────────────────────────
  // Uses Redirect (more reliable than Popup on hosted sites like Netlify)
  window.handleGoogleLogin = function() {
    // Try popup first; if blocked fall back to redirect
    auth.signInWithPopup(googleProvider)
      .then(function(cred) {
        updateUserUI(cred.user);
        window.closeAuthModal();
        var name = cred.user.displayName || cred.user.email.split("@")[0];
        showToast("أهلاً " + name + "! تم الدخول بـ Google ✓", "success");
      })
      .catch(function(err) {
        if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
          // Fallback to redirect
          auth.signInWithRedirect(googleProvider);
        } else {
          var msg = mapError(err.code);
          if (msg) showToast(msg, "error");
        }
      });
  };

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
  window.handleForgotPassword = function() {
    clearMsg("forgot-error");
    clearMsg("forgot-success");
    var email = ($("forgot-email") || {value:""}).value.trim();
    if (!email) return showError("forgot-error","يرجى إدخال بريدك الإلكتروني.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return showError("forgot-error","يرجى إدخال بريد إلكتروني صحيح.");

    setLoading("forgot-submit-btn", true);

    // Send reset email directly — Firebase rejects automatically if email not found
    auth.sendPasswordResetEmail(email)
      .then(function() {
        showSuccess("forgot-success",
          "✅ إذا كان بريدك الإلكتروني مسجلاً في المنصة، فقد تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.\n" +
          "📩 يرجى التحقق من صندوق الوارد (Inbox) أو مجلد البريد غير المرغوب (Spam)."
        );
        $("forgot-email").value = "";
      })
      .catch(function(err) {
        showSuccess("forgot-success",
          "✅ إذا كان بريدك الإلكتروني مسجلاً في المنصة، فقد تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.\n" +
          "📩 يرجى التحقق من صندوق الوارد (Inbox) أو مجلد البريد غير المرغوب (Spam)."
        );
        $("forgot-email").value = "";
      })
      .finally(function() { setLoading("forgot-submit-btn", false); });
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  window.handleLogout = function() {
    closeDropdown();
    auth.signOut().then(function() {
      window.__userLoggedIn__ = false;
      // Clear all per-user data from localStorage
      USER_KEYS.forEach(function(key) {
        try { localStorage.removeItem(key); } catch(e) {}
      });
      // Reset memorize data in memory
      if (typeof window.__reloadMEMO__ === 'function') window.__reloadMEMO__();
      // Reset script.js state
      if (typeof window.refreshStatsUI === 'function') window.refreshStatsUI();
      updateUserUI(null);
      showToast("تم تسجيل الخروج. إلى اللقاء! 👋", "info");
    });
  };

  // ── EDIT USERNAME ─────────────────────────────────────────────────────────
  window.openEditUsername = function() {
    closeDropdown();
    var user = auth.currentUser; if (!user) return;
    var inp = $("edit-username-input");
    if (inp) inp.value = user.displayName || "";
    clearMsg("edit-username-error");
    var o = $("edit-username-overlay");
    if (o) {
      o.classList.add("open");
      document.body.style.overflow = "hidden";
      setTimeout(function() { if (inp) inp.focus(); }, 300);
    }
  };

  window.closeEditUsername = function() {
    var o = $("edit-username-overlay");
    if (o) o.classList.remove("open");
    document.body.style.overflow = "";
  };

  window.closeEditUsernameOnOverlay = function(e) {
    if (e.target === $("edit-username-overlay")) window.closeEditUsername();
  };

  window.handleEditUsername = function() {
    clearMsg("edit-username-error");
    var user    = auth.currentUser;
    var newName = ($("edit-username-input") || {value:""}).value.trim();
    if (!user)              return showError("edit-username-error","يجب تسجيل الدخول أولاً.");
    if (!newName)           return showError("edit-username-error","يرجى إدخال اسم جديد.");
    if (newName.length < 2) return showError("edit-username-error","الاسم يجب أن يكون حرفين على الأقل.");

    setLoading("edit-username-btn", true);
    user.updateProfile({ displayName: newName })
      .then(function() {
        updateUserUI(auth.currentUser);
        window.closeEditUsername();
        showToast("تم تحديث اسمك إلى \"" + newName + "\" ✓", "success");
      })
      .catch(function(err) { showError("edit-username-error", mapError(err.code)); })
      .finally(function() { setLoading("edit-username-btn", false); });
  };

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────
  window.openChangePassword = function() {
    closeDropdown();
    clearMsg("change-pass-error");
    ["current-password-input","new-password-input","confirm-new-password-input"].forEach(function(id) {
      var el = $(id); if (el) el.value = "";
    });
    var o = $("change-pass-overlay");
    if (o) {
      o.classList.add("open");
      document.body.style.overflow = "hidden";
      setTimeout(function() { var el = $("current-password-input"); if (el) el.focus(); }, 300);
    }
  };

  window.closeChangePassword = function() {
    var o = $("change-pass-overlay");
    if (o) o.classList.remove("open");
    document.body.style.overflow = "";
  };

  window.closeChangePassOnOverlay = function(e) {
    if (e.target === $("change-pass-overlay")) window.closeChangePassword();
  };

  window.handleChangePassword = function() {
    clearMsg("change-pass-error");
    var user    = auth.currentUser;
    var current = ($("current-password-input")        || {value:""}).value;
    var newPass = ($("new-password-input")            || {value:""}).value;
    var confirm = ($("confirm-new-password-input")    || {value:""}).value;

    if (!user)             return showError("change-pass-error","يجب تسجيل الدخول أولاً.");
    if (!current)          return showError("change-pass-error","يرجى إدخال كلمة المرور الحالية.");
    if (!newPass)          return showError("change-pass-error","يرجى إدخال كلمة المرور الجديدة.");
    if (newPass.length < 8) return showError("change-pass-error","كلمة المرور الجديدة 8 أحرف على الأقل.");
    if (newPass !== confirm) return showError("change-pass-error","كلمتا المرور غير متطابقتين.");
    if (current === newPass) return showError("change-pass-error","يجب أن تختلف عن الحالية.");

    setLoading("change-pass-btn", true);
    var credential = firebase.auth.EmailAuthProvider.credential(user.email, current);
    user.reauthenticateWithCredential(credential)
      .then(function() { return user.updatePassword(newPass); })
      .then(function() {
        window.closeChangePassword();
        showToast("تم تغيير كلمة المرور بنجاح ✓", "success");
      })
      .catch(function(err) { showError("change-pass-error", mapError(err.code)); })
      .finally(function() { setLoading("change-pass-btn", false); });
  };

  window.__firebaseAuth = auth;

  // ── Firebase Realtime DB — مزامنة الإحصائيات بالمستخدم ───────────────────
  var db = null;
  try { db = firebase.database(); } catch(e) {}

  // Keys we sync per-user
  var USER_KEYS = [
    'quran_bookmarks',
    'quran_streak',
    'quran_lastread',
    'quran_stats',
    'quran_goals',
    'quran_activity',
    'quran_azkar_progress',
    'quran_tasbih',
    'quran_memorize_v1',
    'mshf_page',
    'mshf_bookmarks',
    'mshf_mode',
    'mshf_dual'
  ];

  // Load user data from Firebase into localStorage, then refresh UI
  function loadUserData(uid) {
    if (!db) return;
    db.ref('users/' + uid).once('value').then(function(snap) {
      var data = snap.val();
      if (!data) return;
      USER_KEYS.forEach(function(key) {
        if (data[key] !== undefined) {
          try { localStorage.setItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key])); }
          catch(e) {}
        }
      });
      // Refresh stats UI if script.js has loaded
      if (typeof window.refreshStatsUI === 'function') window.refreshStatsUI();
    }).catch(function() {});
  }

  // Save user data from localStorage to Firebase (called by script.js patches)
  window.saveUserDataToFirebase = function(key, value) {
    var user = auth.currentUser;
    if (!db || !user) return;
    var update = {};
    update[key] = value;
    db.ref('users/' + user.uid).update(update).catch(function() {});
  };

  // When auth state changes, sync user data
  auth.onAuthStateChanged(function(user) {
    window.__userLoggedIn__ = !!user;
    updateUserUI(user);
    if (user) {
      loadUserData(user.uid);
      // Auto-migrate: save email to users node + emails index (covers old users)
      if (db && user.email) {
        db.ref('users/' + user.uid + '/email').once('value').then(function(s) {
          if (!s.exists()) {
            db.ref('users/' + user.uid).update({ email: user.email }).catch(function(){});
          }
        }).catch(function(){});
      }
    }
  });

  // Safety fallback: if onAuthStateChanged never fires (file:// or blocked),
  // treat user as logged-out after 1.5 seconds so the app still loads
  var authResolved = false;
  auth.onAuthStateChanged(function() { authResolved = true; });
  setTimeout(function() {
    if (!authResolved) { updateUserUI(null); }
  }, 1500);

})();
