<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('reminders:generate')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('pet-birthday:check')->dailyAt('09:00');
Schedule::command('notifications:cleanup')->dailyAt('03:30');
