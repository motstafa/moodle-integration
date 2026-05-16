<?php

namespace App\Console\Commands;

use App\Services\Moodle\MoodleApiException;
use App\Services\Moodle\MoodleClient;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;

/**
 * Sanity-check command: fetches the site admin user (id=1) via MoodleClient
 * and prints the result. Run this after filling .env to verify connectivity
 * before touching any controllers.
 *
 * Usage: php artisan moodle:ping
 */
class MoodlePing extends Command
{
    protected $signature   = 'moodle:ping';
    protected $description = 'Verify Moodle Web Services connectivity by fetching user id=1';

    public function handle(MoodleClient $client): int
    {
        $this->info('Pinging Moodle Web Services…');
        $this->line('  URL:      ' . config('services.moodle.url'));
        $this->line('  Function: core_user_get_users_by_field (field=id, value=1)');
        $this->newLine();

        try {
            $users = $client->getUsersByField('id', [1]);
        } catch (MoodleApiException $e) {
            $this->error('Moodle returned an application error:');
            $this->line("  Error code : {$e->moodleErrorCode()}");
            $this->line("  Message    : {$e->getMessage()}");
            return self::FAILURE;
        } catch (ConnectionException $e) {
            $this->error('Could not reach the Moodle server:');
            $this->line("  {$e->getMessage()}");
            return self::FAILURE;
        }

        if (empty($users)) {
            $this->warn('Connected successfully, but no user with id=1 was returned.');
            $this->line('(This is unusual — check the token has the correct capabilities.)');
            return self::SUCCESS;
        }

        $user = $users[0];
        $this->info('Connection successful!');
        $this->table(
            ['Field', 'Value'],
            [
                ['id',        $user['id']        ?? '—'],
                ['username',  $user['username']   ?? '—'],
                ['fullname',  $user['fullname']   ?? '—'],
                ['email',     $user['email']      ?? '—'],
            ]
        );

        return self::SUCCESS;
    }
}
