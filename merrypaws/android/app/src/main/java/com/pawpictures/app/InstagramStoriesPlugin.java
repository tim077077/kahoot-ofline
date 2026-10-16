package com.pawpictures.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

// Opens Instagram's story composer with the story card as the background
// (Meta's "Sharing to Stories"). Called from src/lib/share.ts.
@CapacitorPlugin(name = "InstagramStories")
public class InstagramStoriesPlugin extends Plugin {

    private static final String INSTAGRAM = "com.instagram.android";

    @PluginMethod
    public void share(PluginCall call) {
        String image = call.getString("backgroundImage");
        String appId = call.getString("appId");
        if (image == null || appId == null || appId.isEmpty()) {
            call.reject("A background image and a Meta App ID are needed", "MISSING");
            return;
        }
        try {
            boolean png = image.startsWith("data:image/png");
            byte[] bytes = Base64.decode(image.substring(image.indexOf(',') + 1), Base64.DEFAULT);
            File dir = new File(getContext().getCacheDir(), "stories");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("no cache dir");
            File file = new File(dir, png ? "story.png" : "story.jpg");
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(bytes);
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);

            Intent intent = new Intent("com.instagram.share.ADD_TO_STORY");
            intent.putExtra("source_application", appId);
            intent.setDataAndType(uri, png ? "image/png" : "image/jpeg");
            intent.setPackage(INSTAGRAM);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Activity activity = getActivity();
            if (intent.resolveActivity(activity.getPackageManager()) == null) {
                call.reject("Instagram is not installed", "NOT_INSTALLED");
                return;
            }
            activity.grantUriPermission(INSTAGRAM, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Couldn't open Instagram", "FAILED", e);
        }
    }
}
