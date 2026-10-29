#!/bin/zsh
# Запуск тестов движка во встроенном JavaScriptCore (Node не нужен).
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
FILTER=${1:-}
$JSC js/util.js js/model.js js/net.js js/ios.js js/switching.js js/pc.js js/tasks.js js/coach.js js/course/course.js js/course/itn_1.js js/course/itn_2.js js/course/itn_3.js js/course/itn_4.js js/course/srwe.js js/course/ensa.js js/course/glossary.js js/course/interview.js js/course/srwe_2.js js/course/ensa_2.js js/course/drills.js js/study.js js/clihelp.js js/demos.js tests/harness.js tests/test_*.js -e "var TEST_FILTER='$FILTER'; runTests();"
