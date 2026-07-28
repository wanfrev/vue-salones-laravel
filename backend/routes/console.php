<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('reminders:generate')->everyFiveMinutes();
Schedule::command('pet-birthday:check')->dailyAt('09:00');
