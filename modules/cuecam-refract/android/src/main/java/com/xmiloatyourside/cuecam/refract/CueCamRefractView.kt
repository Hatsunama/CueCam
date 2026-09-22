package com.xmiloatyourside.cuecam.refract

import android.content.Context
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class CueCamRefractView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val canvas = RefractBackgroundView(context).also {
    it.isClickable = false
    it.isFocusable = false
    addView(it, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun setActive(active: Boolean) {
    canvas.visibility = if (active) View.VISIBLE else View.INVISIBLE
  }
}
