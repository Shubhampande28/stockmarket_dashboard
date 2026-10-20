plugins {
    id("com.android.application")
}

android {
    namespace = "com.equilytics.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.equilytics.app"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    signingConfigs {
        // Populated by CI from the EQUILYTICS_KEYSTORE_* secrets (see
        // .github/workflows/android-build.yml). Falls back to the Gradle
        // Android plugin's auto-generated debug keystore when those
        // environment variables aren't set, so `./gradlew assembleDebug`
        // still works locally with no setup.
        create("release") {
            val storeFilePath = System.getenv("EQUILYTICS_KEYSTORE_PATH")
            if (storeFilePath != null) {
                storeFile = file(storeFilePath)
                storePassword = System.getenv("EQUILYTICS_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("EQUILYTICS_KEY_ALIAS")
                keyPassword = System.getenv("EQUILYTICS_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (System.getenv("EQUILYTICS_KEYSTORE_PATH") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}

dependencies {
    // Google's official Trusted Web Activity helper library -- this is
    // what `bubblewrap` (Google's own TWA scaffolding CLI) generates under
    // the hood too; LauncherActivity.kt just extends its base class.
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
}
